import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { handleMultiRoleError, requestTanitCore } from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await requestTanitCore(getSupabaseAdmin(), id);
    return NextResponse.json(result);
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
