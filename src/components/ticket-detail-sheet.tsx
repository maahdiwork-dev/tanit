"use client";

import { Camera, Radar, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getTicket,
  postTicketMessage,
  subscribeToStore,
  tanitProcessPhoto,
  type TicketDetail,
  type TicketMessage,
} from "@/lib/demo-mocks";
import { useRoleContext } from "@/lib/role-context";
import { SideSheet } from "@/components/side-sheet";
import { fmtFR } from "@/components/tanit-constants";

const ESCALATION_LABEL: Record<string, string> = {
  staff: "Staff",
  director: "Directeur",
  dean: "Doyen",
  tanit: "Tanit",
};

const ESCALATION_PILL: Record<string, string> = {
  staff: "bg-zinc-100 text-zinc-700 border-zinc-200",
  director: "bg-blue-50 text-blue-700 border-blue-200",
  dean: "bg-indigo-50 text-indigo-700 border-indigo-200",
  tanit: "bg-blue-100 text-blue-800 border-blue-300 brand-glow",
};

const STATUS_PILL: Record<string, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

const OWNER_STATUS_LABEL: Record<string, string> = {
  available: "disponible",
  busy: "occupé",
  out_of_office: "absent",
  on_mission: "en mission",
};

const OWNER_STATUS_PILL: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700",
  busy: "bg-amber-50 text-amber-700",
  out_of_office: "bg-amber-50 text-amber-700",
  on_mission: "bg-blue-50 text-blue-700",
};

export function TicketDetailSheet({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  const ctx = useRoleContext();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [photoPhase, setPhotoPhase] = useState<"idle" | "uploading" | "processing">(
    "idle",
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!ticketId) {
        setDetail(null);
        return;
      }
      setLoading(true);
      const data = await getTicket(ticketId);
      if (!cancelled) {
        setDetail(data);
        setLoading(false);
      }
    }
    void load();
    const unsubscribe = subscribeToStore(() => {
      void load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detail?.messages.length]);

  if (!ticketId) return null;

  async function send() {
    if (!detail || !input.trim() || sending) return;
    setSending(true);
    const senderRole =
      ctx.role === "staff" || ctx.role === "director" || ctx.role === "dean"
        ? ctx.role
        : "system";
    await postTicketMessage(detail.ticket.id, {
      sender: senderRole,
      sender_user_id: ctx.user_id,
      sender_name: ctx.name,
      content: input.trim(),
    });
    setInput("");
    setSending(false);
  }

  async function uploadPhoto(file: File) {
    if (!detail || photoPhase !== "idle") return;
    setPhotoPhase("uploading");
    const url = URL.createObjectURL(file);
    await postTicketMessage(detail.ticket.id, {
      sender: "staff",
      sender_user_id: ctx.user_id,
      sender_name: ctx.name,
      content: "Photo du document ESG 2024 (papier).",
      attachment_url: url,
    });

    setPhotoPhase("processing");
    // Simulated streaming OCR delay
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    await tanitProcessPhoto(detail.ticket.id);
    setPhotoPhase("idle");
  }

  const ticket = detail?.ticket;
  const messages = detail?.messages ?? [];
  const escalationKey = ticket?.escalation_level ?? "staff";

  return (
    <SideSheet open={true} onClose={onClose}>
      {/* Header */}
      <div className="px-7 py-5 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>Ticket</span>
            <span className="text-zinc-300">/</span>
            <span>{ticketId.slice(0, 12)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-1 -m-1"
          >
            <X size={18} />
          </button>
        </div>

        {ticket ? (
          <>
            <div className="text-[18px] font-semibold tracking-tight text-zinc-950 leading-snug pr-2">
              {ticket.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`text-[10.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  STATUS_PILL[ticket.status] ?? ""
                }`}
              >
                {ticket.status === "open"
                  ? "Ouvert"
                  : ticket.status === "in_progress"
                    ? "En cours"
                    : ticket.status === "resolved"
                      ? "Résolu"
                      : "Annulé"}
              </span>
              <span
                className={`text-[10.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  ESCALATION_PILL[escalationKey] ?? ""
                }`}
              >
                {ESCALATION_LABEL[escalationKey] ?? escalationKey}
              </span>
              {ticket.current_owner ? (
                <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                  <span className="text-zinc-700 font-medium">
                    {ticket.current_owner.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      OWNER_STATUS_PILL[ticket.current_owner.status] ?? ""
                    }`}
                  >
                    {OWNER_STATUS_LABEL[ticket.current_owner.status] ??
                      ticket.current_owner.status}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] text-blue-700 font-medium">
                  Tanit prend le relais
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-zinc-500">Chargement…</div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="px-7 py-5 space-y-3.5 max-h-[55vh] overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="space-y-3">
            <div className="h-12 rounded-md bg-zinc-200/60 animate-pulse" />
            <div className="h-12 rounded-md bg-zinc-200/60 animate-pulse" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-[12.5px] text-zinc-500">Aucun message.</div>
        ) : (
          messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)
        )}

        {photoPhase === "processing" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5">
            <div className="flex items-center gap-2.5 text-[12.5px] text-blue-800">
              <span className="radar-sweep inline-block">
                <Radar size={13} />
              </span>
              Tanit analyse votre photo…
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer input */}
      {ticket?.status !== "resolved" ? (
        <div className="px-7 py-4 border-t border-zinc-200 sticky bottom-0 bg-white/95 backdrop-blur">
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoPhase !== "idle"}
              className="h-11 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium text-white brand-glow disabled:opacity-70"
              style={{
                background: "linear-gradient(180deg,#3b82f6, #1B487E)",
              }}
            >
              <Camera size={15} />
              {photoPhase === "uploading"
                ? "Envoi…"
                : photoPhase === "processing"
                  ? "Analyse…"
                  : "Envoyer une photo"}
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Écrire un message…"
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || sending}
              className="h-11 w-11 rounded-md inline-grid place-items-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  input.trim() && !sending
                    ? "linear-gradient(180deg,#3b82f6, #1B487E)"
                    : "#27272a",
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <div className="text-[10.5px] text-zinc-500 mt-2">
            Tanit peut extraire les KPIs directement à partir d&apos;une photo —
            scanner non requis.
          </div>
        </div>
      ) : (
        <div className="px-7 py-4 border-t border-zinc-200 bg-emerald-50/60 text-[12.5px] text-emerald-700">
          Ticket résolu · indicateurs ESG 2024 enregistrés.
        </div>
      )}
    </SideSheet>
  );
}

function MessageRow({ msg }: { msg: TicketMessage }) {
  if (msg.sender === "system") {
    return (
      <div className="text-center text-[11px] italic text-zinc-500 py-1">
        {msg.content} · <span className="font-mono">{fmtFR(msg.created_at)}</span>
      </div>
    );
  }

  const isTanit = msg.sender === "tanit";
  const containerClass = isTanit
    ? "rounded-lg border-l-2 border-l-blue-500 bg-white border border-zinc-200 p-3.5 brand-glow"
    : "rounded-lg bg-zinc-50 border border-zinc-200 p-3.5";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`text-[11px] font-medium ${
            isTanit ? "text-blue-700" : "text-zinc-700"
          }`}
        >
          {msg.sender_name}
        </span>
        <span className="text-[10.5px] font-mono text-zinc-500">
          {fmtFR(msg.created_at)}
        </span>
      </div>
      {msg.attachment_url ? (
        <div className="mb-2 rounded-md overflow-hidden border border-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={msg.attachment_url}
            alt="Pièce jointe"
            className="w-full max-h-[200px] object-cover"
          />
        </div>
      ) : null}
      <div className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-line">
        {msg.content}
      </div>
      {msg.metadata?.ocr_result ? (
        <div className="mt-2 rounded-md bg-blue-50/40 border border-blue-200/70 px-3 py-2 text-[11.5px] font-mono text-blue-800">
          OCR · confiance{" "}
          {Math.round((msg.metadata.confidence ?? 0) * 100)}%
        </div>
      ) : null}
    </div>
  );
}
