import { NextResponse } from "next/server";

import { ApiError, handleApiError, unwrapRelation } from "@/lib/server-api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const allowedDomains = new Set([
  "academic",
  "finance",
  "hr",
  "research",
  "esg",
  "infrastructure",
]);

const domainAliases: Record<string, string[]> = {
  research: ["research", "recherche"],
  recherche: ["research", "recherche"],
  esg: ["esg", "environnement"],
  hr: ["hr", "rh"],
};

type InstitutionRef = {
  name_fr: string | null;
  acronym: string | null;
};

type KpiWithInstitution = {
  institution_id: string;
  metric: string;
  value: number;
  period: string;
  source: string | null;
  institutions?: InstitutionRef | InstitutionRef[] | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const domain = url.searchParams.get("domain");
    const period = url.searchParams.get("period") || "2023";

    if (!domain || !allowedDomains.has(domain)) {
      throw new ApiError("Parametre domain invalide", 400);
    }

    const domainsToQuery = domainAliases[domain] ?? [domain];

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("kpis")
      .select(
        "institution_id, metric, value, period, source, institutions(name_fr, acronym)",
      )
      .in("domain", domainsToQuery)
      .eq("period", period)
      .order("metric", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(
      ((data ?? []) as KpiWithInstitution[]).map((kpi) => {
        const institution = unwrapRelation(kpi.institutions);

        return {
          institutionId: kpi.institution_id,
          institutionAcronym: institution?.acronym ?? "UCAR",
          institutionName: institution?.name_fr ?? "Université de Carthage",
          metric: kpi.metric,
          value: kpi.value,
          period: kpi.period,
          source: kpi.source,
        };
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
