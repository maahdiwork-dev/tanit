// Mock data layer for the multi-role demo.
// Shapes match `multi-role-api-contract.md`. When Codex's endpoints land,
// swap each function for a `fetch(...)` call.

import type { Role, RoleContext } from "./role-context";

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
    role: Role | null;
    status: "available" | "busy" | "out_of_office" | "on_mission";
  } | null;
  messages_count: number;
  created_at: string;
  escalated_at: string | null;
  metadata: { period?: string; kpi_id?: string };
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
  role_target: Role | null;
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
  beat: number;
};

// ─────────────────────────────────────────────────────────
// In-memory store (resets on page reload).
// Hydrated from localStorage so the demo state persists across tabs.

const STORE_KEY = "tanit_demo_store_v1";

const SEED_DATE = "2026-04-23T09:00:00.000Z";

const TICKET_ID = "tkt_enib_esg_2024";

function nowMinus(days: number): string {
  const d = new Date(SEED_DATE);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildSeed(): {
  state: DemoState;
  tickets: TicketSummary[];
  messages: Record<string, TicketMessage[]>;
  notifications: Notification[];
} {
  const created = nowMinus(2);
  const seedTicket: TicketSummary = {
    id: TICKET_ID,
    title: "ENIB · indicateur ESG 2024 manquant",
    status: "open",
    escalation_level: "staff",
    kind: "missing_document",
    institution: {
      id: "ENIB",
      name_fr: "Ecole Nationale d'Ingénieurs de Bizerte",
    },
    current_owner: {
      id: "yassine_enib",
      name: "Yassine Ben Salem",
      role: "staff",
      status: "available",
    },
    messages_count: 1,
    created_at: created,
    escalated_at: null,
    metadata: { period: "2024-2025", kpi_id: "esg_2024" },
  };

  const seedMessages: TicketMessage[] = [
    {
      id: "msg_seed_1",
      sender: "system",
      sender_user_id: null,
      sender_name: "Tanit · agent de validation",
      content:
        "Ticket créé par l'agent de validation. 6/7 documents reçus pour la période 2024-2025. Indicateur ESG 2024 manquant.",
      attachment_url: null,
      created_at: created,
    },
  ];

  const seedNotifications: Notification[] = [
    {
      id: "notif_seed_1",
      user_id: "yassine_enib",
      role_target: null,
      scope_filter: {},
      type: "submission_incomplete",
      payload: {
        ticket_id: TICKET_ID,
        message: "1 document manquant pour la période 2024-2025",
      },
      read: false,
      created_at: created,
    },
  ];

  return {
    state: { current_simulated_date: SEED_DATE, beat: 0 },
    tickets: [seedTicket],
    messages: { [TICKET_ID]: seedMessages },
    notifications: seedNotifications,
  };
}

type Store = ReturnType<typeof buildSeed>;

function loadStore(): Store {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(STORE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return buildSeed();
  }
}

function saveStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("tanit_demo_store_change"));
}

export function resetDemoStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORE_KEY);
  window.dispatchEvent(new CustomEvent("tanit_demo_store_change"));
}

// ─────────────────────────────────────────────────────────
// Public mock API (mirror the contract shapes)

export async function getTickets(ctx: RoleContext): Promise<TicketSummary[]> {
  const store = loadStore();
  if (ctx.role === "staff")
    return store.tickets.filter((t) => t.current_owner?.id === ctx.user_id);
  if (ctx.role === "director")
    return store.tickets.filter((t) => t.institution.id === ctx.institution_id);
  if (ctx.role === "dean")
    return store.tickets.filter((t) =>
      ctx.domain ? t.institution.id === "ENIB" : true,
    );
  return store.tickets;
}

export async function getTicket(id: string): Promise<TicketDetail | null> {
  const store = loadStore();
  const ticket = store.tickets.find((t) => t.id === id);
  if (!ticket) return null;
  return { ticket, messages: store.messages[id] ?? [] };
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
  const store = loadStore();
  const message: TicketMessage = {
    id: `msg_${Date.now()}`,
    sender: msg.sender,
    sender_user_id: msg.sender_user_id,
    sender_name: msg.sender_name,
    content: msg.content,
    attachment_url: msg.attachment_url ?? null,
    created_at: new Date().toISOString(),
  };
  const list = store.messages[ticketId] ?? [];
  store.messages[ticketId] = [...list, message];
  const idx = store.tickets.findIndex((t) => t.id === ticketId);
  if (idx >= 0) {
    store.tickets[idx] = {
      ...store.tickets[idx],
      messages_count: store.tickets[idx].messages_count + 1,
    };
  }
  saveStore(store);
  return message;
}

// Tanit's OCR + auto-resolve flow (mocked).
export async function tanitProcessPhoto(
  ticketId: string,
): Promise<{ ocr: TicketMessage; resolution: TicketMessage }> {
  const store = loadStore();

  const ocr: TicketMessage = {
    id: `msg_${Date.now()}_ocr`,
    sender: "tanit",
    sender_user_id: null,
    sender_name: "Tanit",
    content:
      "J'ai analysé votre photo. Indicateur ESG 2024 extrait avec succès :\n\n• Énergie : 4 520 kWh\n• Eau : 1 280 m³\n• Déchets : 18,4 tonnes\n\nConfiance OCR : 91%. J'enregistre les KPIs maintenant.",
    attachment_url: null,
    metadata: {
      ocr_result: { energy_kwh: 4520, water_m3: 1280, waste_tons: 18.4 },
      confidence: 0.91,
    },
    created_at: new Date().toISOString(),
  };

  const resolution: TicketMessage = {
    id: `msg_${Date.now()}_resolved`,
    sender: "system",
    sender_user_id: null,
    sender_name: "Tanit",
    content:
      "Ticket résolu. 3 KPIs enregistrés pour ENIB · période 2024-2025. Notifications envoyées au directeur, doyen et présidence.",
    attachment_url: null,
    created_at: new Date(Date.now() + 1500).toISOString(),
  };

  const list = store.messages[ticketId] ?? [];
  store.messages[ticketId] = [...list, ocr, resolution];

  const idx = store.tickets.findIndex((t) => t.id === ticketId);
  if (idx >= 0) {
    store.tickets[idx] = {
      ...store.tickets[idx],
      status: "resolved",
      messages_count: store.tickets[idx].messages_count + 2,
    };
  }

  // Cascade notifications to staff, director, dean, president
  const baseTime = Date.now();
  const cascade: Notification[] = [
    {
      id: `notif_${baseTime}_yassine`,
      user_id: "yassine_enib",
      role_target: null,
      scope_filter: {},
      type: "ticket_resolved",
      payload: {
        ticket_id: ticketId,
        message: "Tanit a clos votre ticket. ESG 2024 enregistré.",
      },
      read: false,
      created_at: new Date(baseTime).toISOString(),
    },
    {
      id: `notif_${baseTime}_director`,
      user_id: null,
      role_target: "director",
      scope_filter: { institution_id: "ENIB" },
      type: "ticket_resolved",
      payload: {
        ticket_id: ticketId,
        message: "ENIB · ticket ESG 2024 résolu par Tanit",
      },
      read: false,
      created_at: new Date(baseTime).toISOString(),
    },
    {
      id: `notif_${baseTime}_dean`,
      user_id: null,
      role_target: "dean",
      scope_filter: { domain: "engineering" },
      type: "ticket_resolved",
      payload: {
        ticket_id: ticketId,
        message: "Ingénierie · ENIB ESG 2024 résolu",
      },
      read: false,
      created_at: new Date(baseTime).toISOString(),
    },
    {
      id: `notif_${baseTime}_president`,
      user_id: null,
      role_target: "president",
      scope_filter: {},
      type: "mission_update",
      payload: {
        ticket_id: ticketId,
        message:
          "Conformité 2024-2025 : 31/33 → 32/33. ENIB ESG 2024 enregistré.",
      },
      read: false,
      created_at: new Date(baseTime).toISOString(),
    },
  ];
  store.notifications.push(...cascade);

  saveStore(store);
  return { ocr, resolution };
}

export async function getNotifications(
  ctx: RoleContext,
  options: { unreadOnly?: boolean } = {},
): Promise<{ notifications: Notification[]; unread_count: number }> {
  const store = loadStore();
  const all = store.notifications.filter((n) => {
    if (n.user_id && n.user_id === ctx.user_id) return true;
    if (n.role_target === ctx.role) {
      if (n.scope_filter.institution_id) {
        return n.scope_filter.institution_id === ctx.institution_id;
      }
      if (n.scope_filter.domain) {
        return n.scope_filter.domain === ctx.domain;
      }
      return true;
    }
    return false;
  });
  const filtered = options.unreadOnly ? all.filter((n) => !n.read) : all;
  filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const unread_count = all.filter((n) => !n.read).length;
  return { notifications: filtered, unread_count };
}

export async function markNotificationRead(id: string): Promise<void> {
  const store = loadStore();
  const idx = store.notifications.findIndex((n) => n.id === id);
  if (idx >= 0) {
    store.notifications[idx] = { ...store.notifications[idx], read: true };
    saveStore(store);
  }
}

export async function getDemoState(): Promise<DemoState> {
  const store = loadStore();
  return store.state;
}

export type FastForwardResult = {
  current_simulated_date: string;
  actions_fired: Array<{ type: string; description: string }>;
};

export async function fastForwardDemo(): Promise<FastForwardResult> {
  const store = loadStore();
  const next = new Date(store.state.current_simulated_date);
  next.setDate(next.getDate() + 1);
  store.state.current_simulated_date = next.toISOString();
  store.state.beat += 1;

  const actions: FastForwardResult["actions_fired"] = [];
  const ticket = store.tickets.find((t) => t.id === TICKET_ID);

  if (!ticket) {
    saveStore(store);
    return { current_simulated_date: next.toISOString(), actions_fired: [] };
  }

  if (ticket.escalation_level === "staff" && store.state.beat === 1) {
    ticket.escalation_level = "director";
    ticket.current_owner = {
      id: "director_enib",
      name: "Directeur ENIB",
      role: "director",
      status: "out_of_office",
    };
    ticket.escalated_at = next.toISOString();
    const sysMsg: TicketMessage = {
      id: `msg_${Date.now()}_esc1`,
      sender: "system",
      sender_user_id: null,
      sender_name: "Tanit",
      content: "Escaladé au Directeur — aucune réponse après 24h.",
      attachment_url: null,
      created_at: next.toISOString(),
    };
    store.messages[TICKET_ID] = [...(store.messages[TICKET_ID] ?? []), sysMsg];
    ticket.messages_count += 1;

    store.notifications.push({
      id: `notif_${Date.now()}_director`,
      user_id: "director_enib",
      role_target: "director",
      scope_filter: { institution_id: "ENIB" },
      type: "escalation_received",
      payload: {
        ticket_id: TICKET_ID,
        message: "Ticket escaladé : ENIB ESG 2024 manquant",
      },
      read: false,
      created_at: next.toISOString(),
    });

    actions.push({
      type: "escalate",
      description: "Escalade au directeur ENIB",
    });
  } else if (ticket.escalation_level === "director" && store.state.beat === 2) {
    ticket.escalation_level = "dean";
    ticket.current_owner = {
      id: "dean_engineering",
      name: "Doyen Ingénierie",
      role: "dean",
      status: "available",
    };
    ticket.escalated_at = next.toISOString();
    const sysMsg: TicketMessage = {
      id: `msg_${Date.now()}_esc2`,
      sender: "system",
      sender_user_id: null,
      sender_name: "Tanit",
      content:
        "Escaladé au Doyen — directeur en mission, aucune réponse après 24h.",
      attachment_url: null,
      created_at: next.toISOString(),
    };
    store.messages[TICKET_ID] = [...(store.messages[TICKET_ID] ?? []), sysMsg];
    ticket.messages_count += 1;

    store.notifications.push({
      id: `notif_${Date.now()}_dean`,
      user_id: "dean_engineering",
      role_target: "dean",
      scope_filter: { domain: "engineering" },
      type: "escalation_received",
      payload: {
        ticket_id: TICKET_ID,
        message: "Ticket escaladé : ENIB ESG 2024 manquant",
      },
      read: false,
      created_at: next.toISOString(),
    });

    actions.push({
      type: "escalate",
      description: "Escalade au doyen ingénierie",
    });
  } else {
    actions.push({
      type: "noop",
      description: "Aucune escalade automatique — la prochaine étape est manuelle (cliquez 'Demander à Tanit' sur l'écran du Doyen)",
    });
  }

  saveStore(store);
  return { current_simulated_date: next.toISOString(), actions_fired: actions };
}

export async function requestTanitOnTicket(
  ticketId: string,
): Promise<{ ticket: TicketSummary; notification: Notification }> {
  const store = loadStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error("Ticket introuvable");

  ticket.escalation_level = "tanit";
  ticket.current_owner = null;

  const sysMsg: TicketMessage = {
    id: `msg_${Date.now()}_tanit_req`,
    sender: "system",
    sender_user_id: null,
    sender_name: "Tanit",
    content: "Le Doyen a demandé l'intervention de Tanit.",
    attachment_url: null,
    created_at: new Date().toISOString(),
  };
  store.messages[ticketId] = [...(store.messages[ticketId] ?? []), sysMsg];
  ticket.messages_count += 1;

  const tanitGreet: TicketMessage = {
    id: `msg_${Date.now()}_tanit_greet`,
    sender: "tanit",
    sender_user_id: null,
    sender_name: "Tanit",
    content:
      "Bonjour Yassine. Je vois que l'indicateur ESG 2024 est en attente. Je peux extraire les chiffres directement à partir d'une photo de votre document — pas besoin de scanner. Envoyez-moi simplement une photo claire.",
    attachment_url: null,
    created_at: new Date(Date.now() + 200).toISOString(),
  };
  store.messages[ticketId] = [...(store.messages[ticketId] ?? []), tanitGreet];
  ticket.messages_count += 1;

  const notification: Notification = {
    id: `notif_${Date.now()}_yassine_tanit`,
    user_id: "yassine_enib",
    role_target: null,
    scope_filter: {},
    type: "tanit_wants_to_talk",
    payload: {
      ticket_id: ticketId,
      message: "Tanit veut vous parler concernant ESG 2024",
    },
    read: false,
    created_at: new Date().toISOString(),
  };
  store.notifications.push(notification);

  saveStore(store);
  return { ticket, notification };
}

export function subscribeToStore(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function handler() {
    callback();
  }
  window.addEventListener("tanit_demo_store_change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("tanit_demo_store_change", handler);
    window.removeEventListener("storage", handler);
  };
}
