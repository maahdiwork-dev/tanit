import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  handleMultiRoleError,
  listNotificationsForRequest,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const payload = await listNotificationsForRequest(
      getSupabaseAdmin(),
      new URL(request.url),
    );
    return NextResponse.json(payload);
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
