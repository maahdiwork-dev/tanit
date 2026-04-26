import { NextResponse } from "next/server";

import { ApiError, handleApiError, unwrapRelation } from "@/lib/server-api";
import { demoAlerts } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type InstitutionRef = {
  name_fr: string | null;
  acronym: string | null;
};

type AlertWithInstitution = {
  id: string;
  institution_id: string;
  metric: string;
  severity: string;
  value: number | null;
  threshold: number | null;
  message: string;
  created_at: string;
  resolved: boolean;
  institutions?: InstitutionRef | InstitutionRef[] | null;
};

function parseResolved(url: URL) {
  const raw = url.searchParams.get("resolved");
  if (raw == null) {
    return false;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  throw new ApiError("Parametre resolved invalide", 400);
}

export async function GET(request: Request) {
  try {
    const resolved = parseResolved(new URL(request.url));
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoAlerts(resolved));
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("alerts")
      .select(
        "id, institution_id, metric, severity, value, threshold, message, created_at, resolved, institutions(name_fr, acronym)",
      )
      .eq("resolved", resolved)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(
      ((data ?? []) as AlertWithInstitution[]).map((alert) => {
        const institution = unwrapRelation(alert.institutions);

        return {
          id: alert.id,
          institutionId: alert.institution_id,
          institutionName: institution?.name_fr ?? null,
          institutionAcronym: institution?.acronym ?? null,
          metric: alert.metric,
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold,
          message: alert.message,
          createdAt: alert.created_at,
          resolved: alert.resolved,
        };
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
