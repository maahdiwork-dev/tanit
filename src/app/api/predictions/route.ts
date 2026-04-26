import { NextResponse } from "next/server";

import { handleApiError, unwrapRelation } from "@/lib/server-api";
import { demoPredictions } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type InstitutionRef = {
  name_fr: string | null;
  acronym: string | null;
};

type PredictionRow = {
  id: string;
  institution_id: string;
  metric: string;
  current_value: number | null;
  trend_data: unknown;
  trend_years: unknown;
  predicted_value: number;
  predicted_period: string;
  confidence: number;
  message: string | null;
  institutions?: InstitutionRef | InstitutionRef[] | null;
};

export async function GET() {
  try {
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoPredictions());
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("predictions")
      .select(
        "id, institution_id, metric, current_value, trend_data, trend_years, predicted_value, predicted_period, confidence, message, institutions(name_fr, acronym)",
      )
      .order("confidence", { ascending: false });

    if (error) {
      if (error.code === "PGRST205" || error.message.includes("predictions")) {
        return NextResponse.json([]);
      }

      throw error;
    }

    return NextResponse.json(
      ((data ?? []) as PredictionRow[]).map((prediction) => {
        const institution = unwrapRelation(prediction.institutions);
        const trendData = Array.isArray(prediction.trend_data)
          ? prediction.trend_data
          : [];

        return {
          id: prediction.id,
          institutionAcronym: institution?.acronym ?? null,
          institutionName: institution?.name_fr ?? null,
          metric: prediction.metric,
          currentValue:
            prediction.current_value ??
            Number(trendData[trendData.length - 1] ?? 0),
          trend: "down",
          trendData,
          trendYears: Array.isArray(prediction.trend_years)
            ? prediction.trend_years
            : [],
          predictedValue: prediction.predicted_value,
          predictedPeriod: prediction.predicted_period,
          confidence: prediction.confidence,
          message: prediction.message,
        };
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
