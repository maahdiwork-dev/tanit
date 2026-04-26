import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  createTicketCore,
  handleMultiRoleError,
  listTicketsForRequest,
  readJson,
  requiredString,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type CreateTicketRequest = {
  institution_id?: unknown;
  kind?: unknown;
  title?: unknown;
  description?: string | null;
  current_owner_user_id?: unknown;
  escalation_level?: string;
  metadata?: Record<string, unknown>;
};

export async function GET(request: Request) {
  try {
    const tickets = await listTicketsForRequest(
      getSupabaseAdmin(),
      new URL(request.url),
    );
    return NextResponse.json({ tickets });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateTicketRequest>(request);
    const ticket = await createTicketCore(getSupabaseAdmin(), {
      institution_id: requiredString(body.institution_id, "institution_id"),
      kind: requiredString(body.kind, "kind"),
      title: requiredString(body.title, "title"),
      description: body.description ?? null,
      current_owner_user_id: requiredString(
        body.current_owner_user_id,
        "current_owner_user_id",
      ),
      escalation_level: body.escalation_level,
      metadata: body.metadata,
    });

    return NextResponse.json(
      {
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
