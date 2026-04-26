import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentSimulatedDate, handleMultiRoleError } from "@/lib/multi-role";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const current_simulated_date = await getCurrentSimulatedDate(
      getSupabaseAdmin(),
    );
    return NextResponse.json({ current_simulated_date });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
