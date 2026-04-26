import * as XLSX from "xlsx";

import { demoInstitutionExportRows } from "@/lib/demo-api-fallbacks";
import {
  actionLabel,
  formatRelativeFr,
  handleApiError,
  optionalPeriod,
} from "@/lib/server-api";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { AuditLogRow, InstitutionRow, SubmissionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function workbookResponse(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Etablissements");
  const workbookBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;

  const today = new Date().toISOString().slice(0, 10);
  const filename = `UCAR-Etablissements-${today}.xlsx`;

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = optionalPeriod(url);
    if (missingSupabaseEnv(true).length > 0) {
      return workbookResponse(demoInstitutionExportRows());
    }

    const supabase = getSupabaseAdmin();

    const { data: institutions, error: institutionsError } = await supabase
      .from("institutions")
      .select("id, code, name_fr, name_ar, acronym, governorate, type")
      .neq("code", "400")
      .order("acronym", { ascending: true });

    if (institutionsError) {
      throw institutionsError;
    }

    const institutionRows = (institutions ?? []) as InstitutionRow[];
    const institutionIds = institutionRows.map((institution) => institution.id);

    const [{ data: submissions, error: submissionsError }, auditResult] =
      await Promise.all([
        supabase
          .from("submissions")
          .select("id, institution_id, period, status, submitted_at")
          .eq("period", period),
        institutionIds.length
          ? supabase
              .from("audit_log")
              .select("id, actor, action, target, details, created_at")
              .in("target", institutionIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (submissionsError) {
      throw submissionsError;
    }
    if (auditResult.error) {
      throw auditResult.error;
    }

    const submissionByInstitution = new Map<string, SubmissionRow>();
    for (const submission of (submissions ?? []) as SubmissionRow[]) {
      submissionByInstitution.set(submission.institution_id, submission);
    }

    const latestAuditByTarget = new Map<string, AuditLogRow>();
    for (const entry of (auditResult.data ?? []) as AuditLogRow[]) {
      if (entry.target && !latestAuditByTarget.has(entry.target)) {
        latestAuditByTarget.set(entry.target, entry);
      }
    }

    const rows = institutionRows.map((institution) => {
      const submission = submissionByInstitution.get(institution.id);
      const submitted = submission?.status === "validated";
      const status = submitted ? "submitted" : "missing";
      const submittedAt = submitted ? submission?.submitted_at ?? "" : "";
      const latest = latestAuditByTarget.get(institution.id);
      const lastAction = submitted
        ? `Soumis · ${formatRelativeFr(submission?.submitted_at)}`
        : latest
          ? `${actionLabel(latest.action)} ${formatRelativeFr(latest.created_at)}`
          : "Aucune action";

      return {
        code: institution.code,
        acronym: institution.acronym,
        name_fr: institution.name_fr,
        name_ar: institution.name_ar ?? "",
        governorate: institution.governorate ?? "",
        type: institution.type ?? "",
        status,
        submitted_at: submittedAt,
        last_action: lastAction,
      };
    });

    return workbookResponse(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
