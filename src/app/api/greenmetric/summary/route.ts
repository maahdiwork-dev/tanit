import { NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/server-api";
import { demoGreenMetricSummary } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { GreenMetricCategoryCode } from "@/types/api";

export const dynamic = "force-dynamic";

const categoryDefinitions: Array<{
  code: GreenMetricCategoryCode;
  metric: string;
  label: string;
  description: string;
  max: number;
}> = [
  {
    code: "SI",
    metric: "greenmetric_si_score",
    label: "Infrastructure et aménagement",
    description: "Espaces verts, accessibilité, sécurité",
    max: 1500,
  },
  {
    code: "EC",
    metric: "greenmetric_ec_score",
    label: "Énergie et climat",
    description: "Consommation, énergies renouvelables, GES",
    max: 2100,
  },
  {
    code: "WS",
    metric: "greenmetric_ws_score",
    label: "Gestion des déchets",
    description: "Tri, recyclage, traitement, déchets toxiques",
    max: 1800,
  },
  {
    code: "WR",
    metric: "greenmetric_wr_score",
    label: "Gestion de l'eau",
    description: "Conservation, recyclage, qualité",
    max: 1000,
  },
  {
    code: "TR",
    metric: "greenmetric_tr_score",
    label: "Transport",
    description: "Mobilité durable, ZEV, parking, piétons",
    max: 1800,
  },
  {
    code: "ED",
    metric: "greenmetric_ed_score",
    label: "Éducation et recherche",
    description: "Cours, publications, événements durabilité",
    max: 1800,
  },
];

const requiredMetrics = [
  "greenmetric_world_rank",
  "greenmetric_natl_rank",
  "greenmetric_total_score",
  ...categoryDefinitions.map((category) => category.metric),
];

type GreenMetricKpiRow = {
  metric: string;
  value: number | string | null;
  period?: string | null;
};

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function statusFor(percentage: number) {
  if (percentage > 75) return "strong";
  if (percentage >= 50) return "medium";
  return "weak";
}

export async function GET() {
  try {
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoGreenMetricSummary());
    }

    const supabase = getSupabaseAdmin();
    const institutionResult = await supabase
      .from("institutions")
      .select("id")
      .eq("code", "400")
      .maybeSingle();

    if (institutionResult.error) {
      throw institutionResult.error;
    }

    if (!institutionResult.data) {
      throw new ApiError("Institution UCAR Présidence introuvable", 404);
    }

    const { data, error } = await supabase
      .from("kpis")
      .select("metric, value, period")
      .eq("institution_id", institutionResult.data.id)
      .in("metric", requiredMetrics)
      .order("period", { ascending: false });

    if (error) {
      throw error;
    }

    const metricValues = new Map<string, number>();
    for (const row of (data ?? []) as GreenMetricKpiRow[]) {
      if (!metricValues.has(row.metric)) {
        metricValues.set(row.metric, Number(row.value ?? 0));
      }
    }

    const missing = requiredMetrics.filter((metric) => !metricValues.has(metric));
    if (missing.length) {
      throw new ApiError(
        `Données GreenMetric incomplètes: ${missing.join(", ")}`,
        500,
      );
    }

    const totalScore = metricValues.get("greenmetric_total_score") ?? 0;
    const maxScore = 10000;
    const categories = categoryDefinitions.map((category) => {
      const score = metricValues.get(category.metric) ?? 0;
      const percentage = roundOne((score / category.max) * 100);

      return {
        code: category.code,
        label: category.label,
        description: category.description,
        score,
        max: category.max,
        percentage,
        status: statusFor(percentage),
      };
    });

    return NextResponse.json({
      worldRank: metricValues.get("greenmetric_world_rank") ?? 688,
      nationalRank: metricValues.get("greenmetric_natl_rank") ?? 1,
      totalScore,
      maxScore,
      percentage: roundOne((totalScore / maxScore) * 100),
      year: 2025,
      categories,
      weakCategories: ["WR", "WS"],
      source: "uigreenmetric.com",
      period: "2025",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
