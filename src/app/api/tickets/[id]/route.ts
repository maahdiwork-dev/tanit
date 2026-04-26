import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { getTicketWithMessages, handleMultiRoleError } from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await getTicketWithMessages(getSupabaseAdmin(), id);
    return NextResponse.json(payload);
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
