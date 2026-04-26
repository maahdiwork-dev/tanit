import { NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/server-api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      throw new ApiError("Champ requis invalide: id", 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .select("id, institution_id, metric")
      .eq("id", id)
      .maybeSingle();

    if (alertError) {
      throw alertError;
    }
    if (!alert) {
      throw new ApiError("Alerte introuvable", 404);
    }

    const resolvedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("alerts")
      .update({ resolved: true })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    if (alert.institution_id) {
      const { error: auditError } = await supabase.from("audit_log").insert({
        actor: "Tanit",
        action: "alert_resolved",
        target: alert.institution_id,
        details: `Alerte ${alert.metric} marquée comme résolue`,
        created_at: resolvedAt,
      });
      if (auditError) {
        console.warn("Audit log insert failed:", auditError.message);
      }
    }

    return NextResponse.json({
      success: true,
      alertId: id,
      resolvedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
