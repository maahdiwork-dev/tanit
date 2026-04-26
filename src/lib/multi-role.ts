import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

export type TicketRow = {
  id: string;
  institution_id: string;
  kind: string;
  title: string;
  description: string | null;
  status: string;
  escalation_level: "staff" | "director" | "dean" | "tanit";
  current_owner_user_id: string | null;
  created_at: string;
  escalated_at: string | null;
  resolved_at: string | null;
  metadata: JsonRecord | null;
};

type StaffUserRow = {
  id: string;
  name: string;
  role: string;
  institution_id: string | null;
  domain: string | null;
  email: string | null;
  status: string;
};

type InstitutionRow = {
  id: string;
  code: string | null;
  name_fr: string | null;
  name_ar: string | null;
  acronym: string | null;
  domain?: string | null;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  sender: string;
  sender_user_id: string | null;
  content: string;
  attachment_url: string | null;
  metadata: JsonRecord | null;
  created_at: string;
};

const TICKET_KINDS = new Set([
  "missing_document",
  "invalid_data",
  "escalation",
  "manual_intervention",
]);

const ESCALATION_LEVELS = new Set(["staff", "director", "dean", "tanit"]);

export type Beat =
  | {
      type: "escalate";
      ticket_id: string;
      from: string;
      to: string;
    }
  | {
      type: "notification_inserted";
      id: string;
      role_target: string;
      user_id: string | null;
    }
  | {
      type: "noop";
      reason: string;
    };

export class MultiRoleApiError extends Error {
  code: string;
  status: number;
  details: JsonRecord;

  constructor(code: string, message: string, status = 500, details: JsonRecord = {}) {
    super(message);
    this.name = "MultiRoleApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function handleMultiRoleError(error: unknown) {
  if (error instanceof MultiRoleApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  const record = asRecord(error);
  const message =
    error instanceof Error
      ? error.message
      : typeof record.message === "string"
        ? record.message
        : "Erreur interne du serveur";
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message,
        details:
          typeof record.code === "string" || typeof record.details === "string"
            ? {
                code: record.code,
                details: record.details,
                hint: record.hint,
              }
            : {},
      },
    },
    { status: 500 },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new MultiRoleApiError("INVALID_JSON", "Corps JSON invalide", 400);
  }
}

export async function readOptionalJson<T>(request: Request): Promise<Partial<T>> {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Partial<T>;
  } catch {
    throw new MultiRoleApiError("INVALID_JSON", "Corps JSON invalide", 400);
  }
}

export function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MultiRoleApiError(
      "VALIDATION_ERROR",
      `Champ requis invalide: ${field}`,
      400,
      { field },
    );
  }

  return value.trim();
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function institutionKeys(institution: InstitutionRow | null | undefined) {
  if (!institution) {
    return [];
  }

  return unique([institution.id, institution.code, institution.acronym]);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

async function loadInstitutions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("institutions")
    .select("id, code, name_fr, name_ar, acronym, domain");

  if (error) {
    throw error;
  }

  return (data ?? []) as InstitutionRow[];
}

export async function resolveInstitution(
  supabase: SupabaseClient,
  key: string | null | undefined,
) {
  if (!key) {
    return null;
  }

  const institutions = await loadInstitutions(supabase);
  const normalized = normalizeKey(key);
  return (
    institutions.find((institution) =>
      institutionKeys(institution).some(
        (candidate) => normalizeKey(candidate) === normalized,
      ),
    ) ?? null
  );
}

async function institutionCandidateKeys(
  supabase: SupabaseClient,
  key: string | null | undefined,
) {
  if (!key) {
    return [];
  }

  const institution = await resolveInstitution(supabase, key);
  return unique([key, ...institutionKeys(institution)]);
}

async function institutionKeysForDomain(supabase: SupabaseClient, domain: string) {
  const institutions = await loadInstitutions(supabase);
  return unique(
    institutions
      .filter((institution) => institution.domain === domain)
      .flatMap((institution) => institutionKeys(institution)),
  );
}

function compactTicketMetadata(metadata: unknown, ownerUserId?: string | null) {
  const record = asRecord(metadata);
  return {
    ...record,
    ...(ownerUserId && !record.original_owner_user_id
      ? { original_owner_user_id: ownerUserId }
      : {}),
  };
}

export async function getCurrentSimulatedDate(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("current_simulated_date")
    .eq("id", "demo")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return String(data?.current_simulated_date ?? new Date().toISOString());
}

export async function setCurrentSimulatedDate(
  supabase: SupabaseClient,
  value: string,
) {
  const { error } = await supabase.from("app_settings").upsert(
    {
      id: "demo",
      current_simulated_date: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

async function insertSystemMessage(
  supabase: SupabaseClient,
  ticketId: string,
  content: string,
  createdAt: string,
  metadata: JsonRecord = {},
) {
  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender: "system",
      sender_user_id: null,
      content,
      metadata: { demo: "multi-role", ...metadata },
      created_at: createdAt,
    })
    .select("id, ticket_id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; ticket_id: string; created_at: string };
}

async function insertNotification(
  supabase: SupabaseClient,
  notification: {
    user_id?: string | null;
    role_target: string;
    scope_filter?: JsonRecord;
    type: string;
    payload: JsonRecord;
    created_at?: string;
  },
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: notification.user_id ?? null,
      role_target: notification.role_target,
      scope_filter: notification.scope_filter ?? {},
      type: notification.type,
      payload: { demo: "multi-role", ...notification.payload },
      read: false,
      created_at: notification.created_at,
    })
    .select("id, user_id, role_target, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    user_id: string | null;
    role_target: string;
    created_at: string;
  };
}

async function getTicket(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new MultiRoleApiError(
      "TICKET_NOT_FOUND",
      `Ticket ${id} does not exist`,
      404,
    );
  }

  return data as TicketRow;
}

async function getStaffUsers(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, StaffUserRow>();
  }

  const { data, error } = await supabase
    .from("admin_staff_users")
    .select("id, name, role, institution_id, domain, email, status")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as StaffUserRow[]).map((user) => [user.id, user]));
}

async function findOwnerForLevel(
  supabase: SupabaseClient,
  ticket: TicketRow,
  level: "director" | "dean",
) {
  if (level === "director") {
    const keys = await institutionCandidateKeys(supabase, ticket.institution_id);
    const query = supabase
      .from("admin_staff_users")
      .select("id, name, role, institution_id, domain, email, status")
      .eq("role", "director")
      .limit(1);
    const { data, error } = keys.length
      ? await query.in("institution_id", keys)
      : await query.eq("institution_id", ticket.institution_id);

    if (error) {
      throw error;
    }

    return ((data ?? []) as StaffUserRow[])[0] ?? null;
  }

  const institution = await resolveInstitution(supabase, ticket.institution_id);
  const domain =
    institution?.domain ??
    (typeof ticket.metadata?.domain === "string"
      ? ticket.metadata.domain
      : null);

  if (!domain) {
    return null;
  }

  const { data, error } = await supabase
    .from("admin_staff_users")
    .select("id, name, role, institution_id, domain, email, status")
    .eq("role", "dean")
    .eq("domain", domain)
    .limit(1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as StaffUserRow[])[0] ?? null;
}

async function scopeForTicket(supabase: SupabaseClient, ticket: TicketRow) {
  const institution = await resolveInstitution(supabase, ticket.institution_id);
  return {
    institution_id: ticket.institution_id,
    ...(institution?.domain ? { domain: institution.domain } : {}),
  };
}

function escalationMessage(to: string, reason?: string) {
  const suffix =
    reason === "no_response_24h" || !reason
      ? "aucune réponse après 24h"
      : reason.replace(/_/g, " ");

  if (to === "director") {
    return `Escaladé au Directeur — ${suffix}`;
  }
  if (to === "dean") {
    return `Escaladé au Doyen — ${suffix}`;
  }
  return `Escaladé à ${to} — ${suffix}`;
}

export async function createTicketCore(
  supabase: SupabaseClient,
  input: {
    institution_id: string;
    kind: string;
    title: string;
    description?: string | null;
    current_owner_user_id: string;
    escalation_level?: string;
    metadata?: JsonRecord;
  },
) {
  if (!TICKET_KINDS.has(input.kind)) {
    throw new MultiRoleApiError(
      "VALIDATION_ERROR",
      `Type de ticket invalide: ${input.kind}`,
      400,
      { field: "kind", allowed: Array.from(TICKET_KINDS) },
    );
  }

  const escalationLevel = input.escalation_level ?? "staff";
  if (!ESCALATION_LEVELS.has(escalationLevel)) {
    throw new MultiRoleApiError(
      "VALIDATION_ERROR",
      `Niveau d'escalade invalide: ${escalationLevel}`,
      400,
      { field: "escalation_level", allowed: Array.from(ESCALATION_LEVELS) },
    );
  }

  const createdAt = await getCurrentSimulatedDate(supabase);
  const metadata = compactTicketMetadata(
    input.metadata,
    input.current_owner_user_id,
  );

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      institution_id: input.institution_id,
      kind: input.kind,
      title: input.title,
      description: input.description ?? null,
      status: "open",
      escalation_level: escalationLevel,
      current_owner_user_id: input.current_owner_user_id,
      created_at: createdAt,
      metadata: { demo: "multi-role", ...metadata },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const row = ticket as TicketRow;
  await insertSystemMessage(
    supabase,
    row.id,
    "Ticket créé par l'agent de validation",
    createdAt,
  );

  await insertNotification(supabase, {
    user_id: input.current_owner_user_id,
    role_target: "staff",
    scope_filter: { institution_id: input.institution_id },
    type: "submission_incomplete",
    payload: {
      ticket_id: row.id,
      message: input.title,
      link: `/staff/tickets/${row.id}`,
    },
    created_at: createdAt,
  });

  return row;
}

export async function appendTicketMessage(
  supabase: SupabaseClient,
  ticketId: string,
  input: {
    sender: string;
    sender_user_id?: string | null;
    content: string;
    attachment_url?: string | null;
    metadata?: JsonRecord;
  },
) {
  const ticket = await getTicket(supabase, ticketId);
  const createdAt = await getCurrentSimulatedDate(supabase);

  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender: input.sender,
      sender_user_id: input.sender_user_id ?? null,
      content: input.content,
      attachment_url: input.attachment_url ?? null,
      metadata: { demo: "multi-role", ...asRecord(input.metadata) },
      created_at: createdAt,
    })
    .select("id, ticket_id, created_at")
    .single();

  if (error) {
    throw error;
  }

  if (
    ticket.current_owner_user_id &&
    input.sender_user_id !== ticket.current_owner_user_id
  ) {
    const ownerById = await getStaffUsers(supabase, [ticket.current_owner_user_id]);
    const owner = ownerById.get(ticket.current_owner_user_id);
    await insertNotification(supabase, {
      user_id: ticket.current_owner_user_id,
      role_target: owner?.role ?? "staff",
      scope_filter: await scopeForTicket(supabase, ticket),
      type: "mission_update",
      payload: {
        ticket_id: ticketId,
        message: `Nouveau message sur le ticket: ${input.content}`,
        link: `/tickets/${ticketId}`,
      },
      created_at: createdAt,
    });
  }

  return data as { id: string; ticket_id: string; created_at: string };
}

export async function escalateTicketCore(
  supabase: SupabaseClient,
  ticketId: string,
  to: "director" | "dean",
  reason = "no_response_24h",
) {
  const ticket = await getTicket(supabase, ticketId);
  if (ticket.status === "resolved") {
    throw new MultiRoleApiError(
      "TICKET_ALREADY_RESOLVED",
      `Ticket ${ticketId} is already resolved`,
      409,
    );
  }
  if (ticket.status === "cancelled") {
    throw new MultiRoleApiError(
      "TICKET_CANCELLED",
      `Ticket ${ticketId} is cancelled`,
      409,
    );
  }
  if (ticket.escalation_level === "tanit") {
    throw new MultiRoleApiError(
      "TICKET_WITH_TANIT",
      `Ticket ${ticketId} is already handled by Tanit`,
      409,
    );
  }

  const expectedCurrentLevel = to === "director" ? "staff" : "director";
  if (ticket.escalation_level !== expectedCurrentLevel) {
    throw new MultiRoleApiError(
      "INVALID_ESCALATION_TRANSITION",
      `Cannot escalate ticket ${ticketId} from ${ticket.escalation_level} to ${to}`,
      409,
      { from: ticket.escalation_level, to },
    );
  }

  const owner = await findOwnerForLevel(supabase, ticket, to);
  if (!owner) {
    throw new MultiRoleApiError(
      "ESCALATION_OWNER_NOT_FOUND",
      `No ${to} owner found for ticket ${ticketId}`,
      422,
      { to },
    );
  }

  const escalatedAt = await getCurrentSimulatedDate(supabase);
  const { data, error } = await supabase
    .from("tickets")
    .update({
      escalation_level: to,
      current_owner_user_id: owner.id,
      escalated_at: escalatedAt,
    })
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await insertSystemMessage(
    supabase,
    ticketId,
    escalationMessage(to, reason),
    escalatedAt,
    { from: ticket.escalation_level, to, reason },
  );

  const notification = await insertNotification(supabase, {
    user_id: owner.id,
    role_target: to,
    scope_filter: await scopeForTicket(supabase, data as TicketRow),
    type: "escalation_received",
    payload: {
      ticket_id: ticketId,
      message: escalationMessage(to, reason),
      link: `/director/tickets/${ticketId}`,
    },
    created_at: escalatedAt,
  });

  return {
    ticket: data as TicketRow,
    notification,
    from: ticket.escalation_level,
    to,
  };
}

export async function requestTanitCore(supabase: SupabaseClient, ticketId: string) {
  const ticket = await getTicket(supabase, ticketId);
  if (ticket.status === "resolved") {
    throw new MultiRoleApiError(
      "TICKET_ALREADY_RESOLVED",
      `Ticket ${ticketId} is already resolved`,
      409,
    );
  }
  if (ticket.escalation_level !== "dean") {
    throw new MultiRoleApiError(
      "TICKET_NOT_AT_DEAN_LEVEL",
      `Ticket ${ticketId} must be escalated to dean before requesting Tanit`,
      409,
      { escalation_level: ticket.escalation_level },
    );
  }

  const originalOwner =
    typeof ticket.metadata?.original_owner_user_id === "string"
      ? ticket.metadata.original_owner_user_id
      : "yassine_enib";
  const escalatedAt = await getCurrentSimulatedDate(supabase);

  const { data, error } = await supabase
    .from("tickets")
    .update({
      escalation_level: "tanit",
      current_owner_user_id: null,
      escalated_at: escalatedAt,
    })
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await insertSystemMessage(
    supabase,
    ticketId,
    "Le Doyen a demandé l'intervention de Tanit",
    escalatedAt,
  );

  const notification = await insertNotification(supabase, {
    user_id: originalOwner,
    role_target: "staff",
    scope_filter: await scopeForTicket(supabase, data as TicketRow),
    type: "tanit_wants_to_talk",
    payload: {
      ticket_id: ticketId,
      message: "Tanit souhaite vous aider à compléter le document manquant.",
      link: `/staff/tickets/${ticketId}`,
    },
    created_at: escalatedAt,
  });

  return { ticket: data as TicketRow, notification_id: notification.id };
}

export async function resolveTicketCore(
  supabase: SupabaseClient,
  ticketId: string,
  input: { resolution_summary: string; resolved_by?: string | null },
) {
  const ticket = await getTicket(supabase, ticketId);
  if (ticket.status === "resolved") {
    throw new MultiRoleApiError(
      "TICKET_ALREADY_RESOLVED",
      `Ticket ${ticketId} is already resolved`,
      409,
    );
  }

  const resolvedAt = await getCurrentSimulatedDate(supabase);
  const { data, error } = await supabase
    .from("tickets")
    .update({
      status: "resolved",
      resolved_at: resolvedAt,
      current_owner_user_id: null,
    })
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const resolvedTicket = data as TicketRow;
  await insertSystemMessage(
    supabase,
    ticketId,
    `Ticket résolu — ${input.resolution_summary}`,
    resolvedAt,
    { resolved_by: input.resolved_by ?? "tanit" },
  );

  const originalOwner =
    typeof ticket.metadata?.original_owner_user_id === "string"
      ? ticket.metadata.original_owner_user_id
      : "yassine_enib";
  const director = await findOwnerForLevel(supabase, ticket, "director");
  const dean = await findOwnerForLevel(supabase, ticket, "dean");
  const scope = await scopeForTicket(supabase, ticket);
  const commonPayload = {
    ticket_id: ticketId,
    message: input.resolution_summary,
    link: `/tickets/${ticketId}`,
  };

  const notifications = await Promise.all([
    insertNotification(supabase, {
      user_id: originalOwner,
      role_target: "staff",
      scope_filter: scope,
      type: "ticket_resolved",
      payload: commonPayload,
      created_at: resolvedAt,
    }),
    insertNotification(supabase, {
      user_id: director?.id ?? null,
      role_target: "director",
      scope_filter: scope,
      type: "ticket_resolved",
      payload: commonPayload,
      created_at: resolvedAt,
    }),
    insertNotification(supabase, {
      user_id: dean?.id ?? null,
      role_target: "dean",
      scope_filter: scope,
      type: "ticket_resolved",
      payload: commonPayload,
      created_at: resolvedAt,
    }),
    insertNotification(supabase, {
      user_id: null,
      role_target: "president",
      scope_filter: {},
      type: "ticket_resolved",
      payload: { ...commonPayload, mission_update: true },
      created_at: resolvedAt,
    }),
  ]);

  return { ticket: resolvedTicket, notifications };
}

export async function listTicketsForRequest(
  supabase: SupabaseClient,
  url: URL,
) {
  const role = url.searchParams.get("role") ?? "president";
  const userId = url.searchParams.get("user_id");
  const institutionId = url.searchParams.get("institution_id");
  const domain = url.searchParams.get("domain");
  const status = url.searchParams.get("status");

  let query = supabase.from("tickets").select("*");
  if (status) {
    query = query.eq("status", status);
  }

  if (role === "staff") {
    if (!userId) {
      return [];
    }
    query = query.eq("current_owner_user_id", userId);
  } else if (role === "director") {
    const keys = await institutionCandidateKeys(supabase, institutionId);
    if (!keys.length) {
      return [];
    }
    query = query.in("institution_id", keys);
  } else if (role === "dean") {
    if (!domain) {
      return [];
    }
    const keys = await institutionKeysForDomain(supabase, domain);
    if (!keys.length) {
      return [];
    }
    query = query.in("institution_id", keys);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw error;
  }

  return formatTickets(supabase, (data ?? []) as TicketRow[]);
}

export async function getTicketWithMessages(
  supabase: SupabaseClient,
  ticketId: string,
) {
  const ticket = await getTicket(supabase, ticketId);
  const [formatted] = await formatTickets(supabase, [ticket]);

  const { data, error } = await supabase
    .from("ticket_messages")
    .select("id, ticket_id, sender, sender_user_id, content, attachment_url, metadata, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    ticket: formatted,
    messages: (data ?? []) as TicketMessageRow[],
  };
}

export async function formatTickets(
  supabase: SupabaseClient,
  tickets: TicketRow[],
) {
  if (tickets.length === 0) {
    return [];
  }

  const institutions = await loadInstitutions(supabase);
  const institutionByKey = new Map<string, InstitutionRow>();
  for (const institution of institutions) {
    for (const key of institutionKeys(institution)) {
      institutionByKey.set(normalizeKey(key), institution);
    }
  }

  const ownerIds = unique(tickets.map((ticket) => ticket.current_owner_user_id));
  const ownerById = await getStaffUsers(supabase, ownerIds);
  const ticketIds = tickets.map((ticket) => ticket.id);

  const { data: messages, error: messageError } = await supabase
    .from("ticket_messages")
    .select("ticket_id")
    .in("ticket_id", ticketIds);

  if (messageError) {
    throw messageError;
  }

  const counts = new Map<string, number>();
  for (const message of (messages ?? []) as Array<{ ticket_id: string }>) {
    counts.set(message.ticket_id, (counts.get(message.ticket_id) ?? 0) + 1);
  }

  return tickets.map((ticket) => {
    const institution =
      institutionByKey.get(normalizeKey(ticket.institution_id)) ?? null;
    const owner = ticket.current_owner_user_id
      ? ownerById.get(ticket.current_owner_user_id) ?? null
      : null;

    return {
      ...ticket,
      institution: institution
        ? {
            id: institution.acronym ?? institution.code ?? institution.id,
            uuid: institution.id,
            name_fr: institution.name_fr,
            name_ar: institution.name_ar,
            acronym: institution.acronym,
            domain: institution.domain ?? null,
          }
        : null,
      current_owner: owner
        ? {
            id: owner.id,
            name: owner.name,
            role: owner.role,
            status: owner.status,
          }
        : null,
      messages_count: counts.get(ticket.id) ?? 0,
    };
  });
}

function scopeMatches(
  scope: unknown,
  context: { institution_id?: string | null; domain?: string | null },
) {
  const record = asRecord(scope);
  const institution = record.institution_id;
  const domain = record.domain;

  if (
    typeof institution === "string" &&
    context.institution_id &&
    institution !== context.institution_id
  ) {
    return false;
  }

  if (typeof institution === "string" && !context.institution_id) {
    return false;
  }

  if (typeof domain === "string" && context.domain && domain !== context.domain) {
    return false;
  }

  if (typeof domain === "string" && !context.domain) {
    return false;
  }

  return true;
}

export async function listNotificationsForRequest(
  supabase: SupabaseClient,
  url: URL,
) {
  const role = url.searchParams.get("role") ?? "president";
  const userId = url.searchParams.get("user_id");
  const institutionId = url.searchParams.get("institution_id");
  const domain = url.searchParams.get("domain");
  const unreadOnly = url.searchParams.get("unread_only") === "true";

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  const scoped = ((data ?? []) as Array<JsonRecord>).filter((notification) => {
    const direct =
      typeof userId === "string" &&
      userId.length > 0 &&
      notification.user_id === userId;
    const broadcast =
      notification.role_target === role &&
      scopeMatches(notification.scope_filter, {
        institution_id: institutionId,
        domain,
      });

    return direct || broadcast;
  });
  const unreadCount = scoped.filter((item) => item.read === false).length;

  return {
    notifications: unreadOnly
      ? scoped.filter((item) => item.read === false)
      : scoped,
    unread_count: unreadCount,
  };
}

function hoursBetween(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 36e5;
}

export async function runNextDemoBeat(supabase: SupabaseClient) {
  const currentSimulatedDate = await getCurrentSimulatedDate(supabase);
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("status", "open")
    .in("escalation_level", ["staff", "director"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const tickets = (data ?? []) as TicketRow[];
  const staffTicket = tickets.find(
    (ticket) =>
      ticket.escalation_level === "staff" &&
      hoursBetween(ticket.created_at, currentSimulatedDate) >= 24,
  );

  if (staffTicket) {
    const result = await escalateTicketCore(
      supabase,
      staffTicket.id,
      "director",
      "no_response_24h",
    );

    return {
      actions: [
        {
          type: "escalate",
          ticket_id: staffTicket.id,
          from: result.from,
          to: result.to,
        },
        {
          type: "notification_inserted",
          id: result.notification.id,
          role_target: result.notification.role_target,
          user_id: result.notification.user_id,
        },
      ] satisfies Beat[],
      newSimulatedDate: currentSimulatedDate,
    };
  }

  const directorTicket = tickets.find(
    (ticket) =>
      ticket.escalation_level === "director" &&
      hoursBetween(
        ticket.escalated_at ?? ticket.created_at,
        currentSimulatedDate,
      ) >= 24,
  );

  if (directorTicket) {
    const result = await escalateTicketCore(
      supabase,
      directorTicket.id,
      "dean",
      "no_response_24h",
    );

    return {
      actions: [
        {
          type: "escalate",
          ticket_id: directorTicket.id,
          from: result.from,
          to: result.to,
        },
        {
          type: "notification_inserted",
          id: result.notification.id,
          role_target: result.notification.role_target,
          user_id: result.notification.user_id,
        },
      ] satisfies Beat[],
      newSimulatedDate: currentSimulatedDate,
    };
  }

  return {
    actions: [{ type: "noop", reason: "No eligible scripted escalation" }] satisfies Beat[],
    newSimulatedDate: currentSimulatedDate,
  };
}

export async function resetDemoState(supabase: SupabaseClient) {
  const simulatedDate = "2026-04-23T09:00:00Z";
  const ticketId = "00000000-0000-4000-8000-000000000001";

  await setCurrentSimulatedDate(supabase, simulatedDate);

  for (const table of ["notifications", "ticket_messages", "tickets"] as const) {
    const column = table === "notifications" ? "payload->>demo" : "metadata->>demo";
    const { error } = await supabase.from(table).delete().eq(column, "multi-role");
    if (error) {
      throw error;
    }
  }

  const { error: staffError } = await supabase
    .from("admin_staff_users")
    .upsert(
      [
        {
          id: "yassine_enib",
          name: "Yassine Ben Salem",
          role: "staff",
          institution_id: "ENIB",
          domain: null,
          email: "yassine.bensalem@enib.ucar.tn",
          status: "available",
        },
        {
          id: "director_enib",
          name: "Directeur de l'ENIB",
          role: "director",
          institution_id: "ENIB",
          domain: null,
          email: "direction@enib.ucar.tn",
          status: "out_of_office",
        },
        {
          id: "dean_engineering",
          name: "Doyen du domaine Ingénierie",
          role: "dean",
          institution_id: null,
          domain: "engineering",
          email: "doyen.engineering@ucar.tn",
          status: "available",
        },
      ],
      { onConflict: "id" },
    );

  if (staffError) {
    throw staffError;
  }

  const institution = await resolveInstitution(supabase, "ENIB");
  if (!institution) {
    throw new MultiRoleApiError(
      "INSTITUTION_NOT_FOUND",
      "Institution ENIB introuvable",
      404,
    );
  }

  const { error: kpiDeleteError } = await supabase
    .from("kpis")
    .delete()
    .eq("institution_id", institution.id)
    .eq("period", "2024-2025")
    .eq("source", "demo_multi_role_seed");

  if (kpiDeleteError) {
    throw kpiDeleteError;
  }

  const { error: submissionError } = await supabase.from("submissions").upsert(
    {
      institution_id: institution.id,
      period: "2024-2025",
      status: "pending",
      submitted_at: null,
      domain: "esg",
    },
    { onConflict: "institution_id,period" },
  );

  if (submissionError) {
    throw submissionError;
  }

  const kpiRows = [
    ["energy_kwh", 4520],
    ["water_m3", 1280],
    ["waste_tons", 18.4],
    ["green_space_m2", 7300],
    ["recycling_rate_pct", 42],
    ["carbon_tons", 91],
  ].map(([metric, value]) => ({
    institution_id: institution.id,
    domain: "esg",
    metric,
    value,
    period: "2024-2025",
    source: "demo_multi_role_seed",
  }));

  const { error: kpiInsertError } = await supabase.from("kpis").insert(kpiRows);
  if (kpiInsertError) {
    throw kpiInsertError;
  }

  const ticketCreatedAt = new Date(
    new Date(simulatedDate).getTime() - 48 * 36e5,
  ).toISOString();
  const { error: ticketError } = await supabase.from("tickets").insert({
    id: ticketId,
    institution_id: "ENIB",
    kind: "missing_document",
    title: "ENIB · indicateur ESG 2024 manquant",
    description: "Soumission incomplète — 6/7 documents reçus",
    status: "open",
    escalation_level: "staff",
    current_owner_user_id: "yassine_enib",
    created_at: ticketCreatedAt,
    metadata: {
      period: "2024-2025",
      kpi_id: "esg_2024",
      demo: "multi-role",
      original_owner_user_id: "yassine_enib",
    },
  });

  if (ticketError) {
    throw ticketError;
  }

  await insertSystemMessage(
    supabase,
    ticketId,
    "Ticket créé par l'agent de validation",
    ticketCreatedAt,
  );
  const notification = await insertNotification(supabase, {
    user_id: "yassine_enib",
    role_target: "staff",
    scope_filter: { institution_id: "ENIB" },
    type: "submission_incomplete",
    payload: {
      ticket_id: ticketId,
      message: "1 document manquant",
      link: `/staff/tickets/${ticketId}`,
    },
    created_at: simulatedDate,
  });

  return {
    reset_at: new Date().toISOString(),
    current_simulated_date: simulatedDate,
    ticket_id: ticketId,
    notification_id: notification.id,
  };
}
