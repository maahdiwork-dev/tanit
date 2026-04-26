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

    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .select("id, acronym")
      .eq("id", id)
      .maybeSingle();

    if (institutionError) {
      throw institutionError;
    }
    if (!institution) {
      throw new ApiError("Établissement introuvable", 404);
    }

    const sentAt = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("audit_log")
      .insert({
        actor: "Tanit (manuel)",
        action: "reminder_sent",
        target: id,
        details: `Rappel manuel envoyé à ${institution.acronym}`,
        created_at: sentAt,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      auditEntryId: inserted?.id ?? null,
      sentAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
