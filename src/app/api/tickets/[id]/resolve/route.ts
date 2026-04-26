import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  handleMultiRoleError,
  readJson,
  requiredString,
  resolveTicketCore,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResolveRequest = {
  resolution_summary?: unknown;
  resolved_by?: string | null;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJson<ResolveRequest>(request);
    const result = await resolveTicketCore(getSupabaseAdmin(), id, {
      resolution_summary: requiredString(
        body.resolution_summary,
        "resolution_summary",
      ),
      resolved_by: body.resolved_by ?? "tanit",
    });

    return NextResponse.json({
      ticket: {
        id: result.ticket.id,
        status: result.ticket.status,
        resolved_at: result.ticket.resolved_at,
      },
      notifications_inserted: result.notifications.length,
    });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
