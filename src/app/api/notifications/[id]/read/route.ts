import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { handleMultiRoleError } from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { error } = await getSupabaseAdmin()
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
