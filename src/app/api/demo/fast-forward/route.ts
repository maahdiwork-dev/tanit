import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getCurrentSimulatedDate,
  handleMultiRoleError,
  readOptionalJson,
  runNextDemoBeat,
  setCurrentSimulatedDate,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type FastForwardRequest = {
  step?: string;
};

export async function POST(request: Request) {
  try {
    await readOptionalJson<FastForwardRequest>(request);
    const supabase = getSupabaseAdmin();
    const current = await getCurrentSimulatedDate(supabase);
    const next = new Date(new Date(current).getTime() + 24 * 36e5).toISOString();
    await setCurrentSimulatedDate(supabase, next);

    const beat = await runNextDemoBeat(supabase);
    return NextResponse.json({
      current_simulated_date: beat.newSimulatedDate,
      actions: beat.actions,
      actions_fired: beat.actions,
    });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
