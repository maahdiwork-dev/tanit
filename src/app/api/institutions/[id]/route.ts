import { NextResponse } from "next/server";

import { ApiError, handleApiError, optionalPeriod } from "@/lib/server-api";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AuditLogRow, InstitutionRow, KpiRow, SubmissionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const period = optionalPeriod(new URL(request.url));
    const supabase = getSupabaseAdmin();

    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .select("id, code, name_fr, name_ar, acronym, governorate, type")
      .eq("id", id)
      .maybeSingle();

    if (institutionError) {
      throw institutionError;
    }

    if (!institution) {
      throw new ApiError("Etablissement introuvable", 404);
    }

    const [submissionResult, auditResult, kpiResult] = await Promise.all([
      supabase
        .from("submissions")
        .select("id, institution_id, period, status, submitted_at")
        .eq("institution_id", id)
        .eq("period", period)
        .maybeSingle(),
      supabase
        .from("audit_log")
        .select("id, actor, action, target, details, created_at")
        .eq("target", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("kpis")
        .select("domain, metric, value, period, institution_id")
        .eq("institution_id", id)
        .order("period", { ascending: false }),
    ]);

    if (submissionResult.error) {
      throw submissionResult.error;
    }
    if (auditResult.error) {
      throw auditResult.error;
    }
    if (kpiResult.error) {
      throw kpiResult.error;
    }

    const submission = submissionResult.data as SubmissionRow | null;

    return NextResponse.json({
      institution: institution as InstitutionRow,
      submission: {
        status: submission?.status === "validated" ? "submitted" : "missing",
        period,
      },
      auditTrail: ((auditResult.data ?? []) as AuditLogRow[]).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
        createdAt: entry.created_at,
      })),
      kpis: ((kpiResult.data ?? []) as KpiRow[]).map((kpi) => ({
        domain: kpi.domain,
        metric: kpi.metric,
        value: kpi.value,
        period: kpi.period,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
