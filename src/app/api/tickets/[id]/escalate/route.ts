import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  MultiRoleApiError,
  escalateTicketCore,
  handleMultiRoleError,
  readJson,
  requiredString,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EscalateRequest = {
  to?: unknown;
  reason?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJson<EscalateRequest>(request);
    const to = requiredString(body.to, "to");
    if (to !== "director" && to !== "dean") {
      throw new MultiRoleApiError(
        "INVALID_ESCALATION_TARGET",
        "Escalade autorisée uniquement vers director ou dean",
        400,
        { to },
      );
    }

    const result = await escalateTicketCore(
      getSupabaseAdmin(),
      id,
      to,
      body.reason,
    );

    return NextResponse.json({
      ticket: {
        id: result.ticket.id,
        escalation_level: result.ticket.escalation_level,
        current_owner_user_id: result.ticket.current_owner_user_id,
        escalated_at: result.ticket.escalated_at,
      },
    });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
