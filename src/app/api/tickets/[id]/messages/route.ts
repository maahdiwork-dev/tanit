import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  appendTicketMessage,
  handleMultiRoleError,
  readJson,
  requiredString,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MessageRequest = {
  sender?: unknown;
  sender_user_id?: string | null;
  content?: unknown;
  attachment_url?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJson<MessageRequest>(request);
    const message = await appendTicketMessage(getSupabaseAdmin(), id, {
      sender: requiredString(body.sender, "sender"),
      sender_user_id: body.sender_user_id ?? null,
      content: requiredString(body.content, "content"),
      attachment_url: body.attachment_url ?? null,
      metadata: body.metadata,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
