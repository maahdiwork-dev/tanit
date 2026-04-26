import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { handleMultiRoleError, resetDemoState } from "@/lib/multi-role";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const payload = await resetDemoState(getSupabaseAdmin());
    return NextResponse.json(payload);
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
