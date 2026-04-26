// Real API + Supabase Realtime layer for the multi-role demo.
// Same function signatures as the previous mock layer — all components
// importing from this file keep working unchanged.
//
// Cross-tab live sync: Supabase Realtime (primary) + localStorage "pulse"
// fallback (fires on every mutation; storage events cross same-origin tabs).

import { getSupabase } from "./supabase";
import type { RoleContext } from "./role-context";

export type TicketStatus = "open" | "in_progress" | "resolved" | "cancelled";
export type EscalationLevel = "staff" | "director" | "dean" | "tanit";

export type TicketSummary = {
  id: string;
  title: string;
  status: TicketStatus;
  escalation_level: EscalationLevel;
  kind: string;
  institution: { id: string; name_fr: string; name_ar?: string };
  current_owner: {
    id: string | null;
    name: string;
    role: "staff" | "director" | "dean" | null;
    status: "available" | "busy" | "out_of_office" | "on_mission";
  } | null;
  messages_count: number;
  created_at: string;
  escalated_at: string | null;
  metadata: Record<string, unknown>;
};

export type TicketMessage = {
  id: string;
  sender: "staff" | "director" | "dean" | "tanit" | "system";
  sender_user_id: string | null;
  sender_name: string;
  content: string;
  attachment_url: string | null;
  metadata?: { ocr_result?: Record<string, number>; confidence?: number };
  created_at: string;
};

export type TicketDetail = {
  ticket: TicketSummary;
  messages: TicketMessage[];
};

export type Notification = {
  id: string;
  user_id: string | null;
  role_target: "staff" | "director" | "dean" | "president" | null;
  scope_filter: { institution_id?: string; domain?: string };
  type:
    | "submission_incomplete"
    | "escalation_received"
    | "tanit_wants_to_talk"
    | "ticket_resolved"
    | "mission_update";
  payload: { ticket_id?: string; message: string; link?: string };
  read: boolean;
  created_at: string;
};

export type DemoState = {
  current_simulated_date: string;
  beat?: number;
};

// ─────────────────────────────────────────────────────────
// Cross-tab pulse (fallback when Realtime is laggy)

const PULSE_KEY = "tanit_demo_pulse";

function emitPulse() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PULSE_KEY, String(Date.now()));
  } catch {
    /* ignore quota errors */
  }
  // Same-tab listeners (storage event doesn't fire in the writing tab)
  window.dispatchEvent(new CustomEvent("tanit_demo_store_change"));
}

// ─────────────────────────────────────────────────────────
// Build query string for role-scoped endpoints

function ctxQuery(ctx: RoleContext, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  params.set("role", ctx.role);
  if (ctx.user_id) params.set("user_id", ctx.user_id);
  if (ctx.institution_id) params.set("institution_id", ctx.institution_id);
  if (ctx.domain) params.set("domain", ctx.domain);
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value);
  }
  return params.toString();
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? body?.error ?? JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────
// Public API

export async function getTickets(ctx: RoleContext): Promise<TicketSummary[]> {
  const res = await fetch(`/api/tickets?${ctxQuery(ctx)}`);
  const data = await jsonOrThrow<{ tickets: TicketSummary[] }>(res);
  return data.tickets;
}

export async function getTicket(id: string): Promise<TicketDetail | null> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  return jsonOrThrow<TicketDetail>(res);
}

export async function postTicketMessage(
  ticketId: string,
  msg: {
    sender: TicketMessage["sender"];
    sender_user_id: string | null;
    sender_name: string;
    content: string;
    attachment_url?: string | null;
  },
): Promise<TicketMessage> {
  const res = await fetch(
    `/api/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    },
  );
  const created = await jsonOrThrow<TicketMessage>(res);
  emitPulse();
  return created;
}

// Codex's backend triggers OCR automatically when a message arrives with
// an `attachment_url`. We just emit a pulse so other tabs refetch.
// Tanit's response message appears via Realtime / pulse / polling.
export async function tanitProcessPhoto(): Promise<void> {
  emitPulse();
}

export async function getNotifications(
  ctx: RoleContext,
  options: { unreadOnly?: boolean } = {},
): Promise<{ notifications: Notification[]; unread_count: number }> {
  const extra: Record<string, string> = {};
  if (options.unreadOnly) extra.unread_only = "true";
  const res = await fetch(`/api/notifications?${ctxQuery(ctx, extra)}`);
  return jsonOrThrow<{ notifications: Notification[]; unread_count: number }>(
    res,
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
  emitPulse();
}

export async function getDemoState(): Promise<DemoState> {
  const res = await fetch(`/api/demo/state`);
  return jsonOrThrow<DemoState>(res);
}

export type FastForwardResult = {
  current_simulated_date: string;
  actions_fired: Array<{ type: string; description: string }>;
};

export async function fastForwardDemo(): Promise<FastForwardResult> {
  const res = await fetch(`/api/demo/fast-forward`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "next" }),
  });
  type RawAction = {
    type: string;
    description?: string;
    from?: string;
    to?: string;
    role_target?: string;
  };
  const data = await jsonOrThrow<{
    current_simulated_date: string;
    actions_fired?: RawAction[];
    actions?: RawAction[];
  }>(res);
  emitPulse();
  const raw = data.actions_fired ?? data.actions ?? [];
  // Build human-readable French descriptions when Codex's payload is structural.
  const ROLE_LABEL: Record<string, string> = {
    staff: "staff",
    director: "directeur",
    dean: "doyen",
    tanit: "Tanit",
    president: "présidente",
  };
  const actions: FastForwardResult["actions_fired"] = [];
  for (const a of raw) {
    if (a.description) {
      actions.push({ type: a.type, description: a.description });
      continue;
    }
    if (a.type === "escalate" && a.from && a.to) {
      actions.push({
        type: a.type,
        description: `Escalade ${ROLE_LABEL[a.from] ?? a.from} → ${
          ROLE_LABEL[a.to] ?? a.to
        }`,
      });
    } else if (a.type === "notification_inserted") {
      // Skip: low value next to the escalation summary
      continue;
    } else {
      actions.push({ type: a.type, description: a.type });
    }
  }
  return {
    current_simulated_date: data.current_simulated_date,
    actions_fired: actions.length
      ? actions
      : [{ type: "advance", description: "Cycle avancé de 24h." }],
  };
}

export async function resetDemoStore(): Promise<void> {
  try {
    await fetch(`/api/demo/reset`, { method: "POST" });
  } catch {
    /* best effort */
  }
  emitPulse();
}

export async function requestTanitOnTicket(
  ticketId: string,
): Promise<{ ticket: TicketSummary | null }> {
  const res = await fetch(
    `/api/tickets/${encodeURIComponent(ticketId)}/request-tanit`,
    { method: "POST" },
  );
  const data = await jsonOrThrow<{ ticket?: TicketSummary }>(res);
  emitPulse();
  return { ticket: data.ticket ?? null };
}

// ─────────────────────────────────────────────────────────
// Realtime subscription
//
// Callbacks fire when:
// 1. A row in `notifications`, `tickets`, or `ticket_messages` changes
//    (Supabase Realtime — works across any client subscribed to the same project)
// 2. Another tab in the same browser writes to localStorage (pulse fallback)
// 3. A write happens in the same tab (custom event from emitPulse)

export function subscribeToStore(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  // Realtime — postgres_changes on the three demo tables
  let unsubscribeRealtime: () => void = () => {};
  try {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`demo-multi-role-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => callback(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => callback(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_messages" },
        () => callback(),
      )
      .subscribe();

    unsubscribeRealtime = () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* swallow */
      }
    };
  } catch {
    /* If Supabase env not available, just use storage-event fallback */
  }

  // Cross-tab + same-tab pulse fallback
  function onStorage(event: StorageEvent) {
    if (event.key === PULSE_KEY) callback();
  }
  function onCustom() {
    callback();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("tanit_demo_store_change", onCustom);

  return () => {
    unsubscribeRealtime();
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("tanit_demo_store_change", onCustom);
  };
}
