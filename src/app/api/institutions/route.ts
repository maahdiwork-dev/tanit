import { NextResponse } from "next/server";

import {
  actionLabel,
  formatRelativeFr,
  handleApiError,
  optionalPeriod,
} from "@/lib/server-api";
import { demoInstitutions } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { AuditLogRow, InstitutionRow, SubmissionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const period = optionalPeriod(new URL(request.url));
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoInstitutions());
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

    const submissionsByInstitution = new Map<string, SubmissionRow>();
    for (const submission of (submissions ?? []) as SubmissionRow[]) {
      submissionsByInstitution.set(submission.institution_id, submission);
    }

    const latestAuditByTarget = new Map<string, AuditLogRow>();
    for (const entry of (auditResult.data ?? []) as AuditLogRow[]) {
      if (entry.target && !latestAuditByTarget.has(entry.target)) {
        latestAuditByTarget.set(entry.target, entry);
      }
    }

    return NextResponse.json(
      institutionRows.map((institution) => {
        const submission = submissionsByInstitution.get(institution.id);
        const submitted = submission?.status === "validated";
        const latestAudit = latestAuditByTarget.get(institution.id);
        const lastAction = submitted
          ? `Soumis · ${formatRelativeFr(submission.submitted_at)}`
          : latestAudit
            ? `${actionLabel(latestAudit.action)} ${formatRelativeFr(
                latestAudit.created_at,
              )}`
            : "Aucune action";

        return {
          id: institution.id,
          code: institution.code,
          name_fr: institution.name_fr,
          name_ar: institution.name_ar,
          acronym: institution.acronym,
          governorate: institution.governorate,
          submissionStatus: submitted ? "submitted" : "missing",
          submittedAt: submitted ? submission.submitted_at : null,
          lastAction,
        };
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
