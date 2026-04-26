import { NextResponse } from "next/server";

import { handleApiError, optionalPeriod } from "@/lib/server-api";
import { demoDashboardSummary } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const period = optionalPeriod(new URL(request.url));
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoDashboardSummary());
    }

    const supabase = getSupabaseAdmin();

    const [
      institutionsResult,
      submissionsResult,
      studentsResult,
      activeAlertsResult,
      criticalAlertsResult,
    ] = await Promise.all([
      supabase
        .from("institutions")
        .select("id", { count: "exact", head: true })
        .neq("code", "400"),
      supabase
        .from("submissions")
        .select("institution_id")
        .eq("period", period)
        .eq("status", "validated"),
      supabase
        .from("kpis")
        .select("value")
        .eq("metric", "effectif_etudiants")
        .eq("period", "2023"),
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("resolved", false),
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("resolved", false)
        .eq("severity", "critical"),
    ]);

    for (const result of [
      institutionsResult,
      submissionsResult,
      studentsResult,
      activeAlertsResult,
      criticalAlertsResult,
    ]) {
      if (result.error) {
        throw result.error;
      }
    }

    const totalInstitutions = institutionsResult.count ?? 0;
    const submittedCount = new Set(
      (submissionsResult.data ?? []).map((row) => row.institution_id),
    ).size;
    const missingCount = Math.max(0, totalInstitutions - submittedCount);
    const complianceRate =
      totalInstitutions === 0
        ? 0
        : Math.round((submittedCount / totalInstitutions) * 100);
    const totalStudents = Math.round(
      (studentsResult.data ?? []).reduce(
        (sum, row) => sum + Number(row.value ?? 0),
        0,
      ),
    );

    return NextResponse.json({
      totalInstitutions,
      submittedCount,
      missingCount,
      complianceRate,
      totalStudents,
      activeAlerts: activeAlertsResult.count ?? 0,
      criticalAlerts: criticalAlertsResult.count ?? 0,
      trendVsPrevious: "up",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
