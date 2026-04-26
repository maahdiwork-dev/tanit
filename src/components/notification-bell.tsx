"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotifications,
  markNotificationRead,
  type Notification,
  subscribeToStore,
} from "@/lib/demo-mocks";
import { useRoleContext } from "@/lib/role-context";
import { fmtFR } from "@/components/tanit-constants";

const TYPE_LABEL: Record<Notification["type"], string> = {
  submission_incomplete: "Soumission incomplète",
  escalation_received: "Escalade reçue",
  tanit_wants_to_talk: "Tanit veut vous parler",
  ticket_resolved: "Ticket résolu",
  mission_update: "Mise à jour mission",
};

export function NotificationBell() {
  const router = useRouter();
  const ctx = useRoleContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await getNotifications(ctx);
    setItems(res.notifications);
    setUnread(res.unread_count);
  }, [ctx]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const unsubscribe = subscribeToStore(() => {
      void refresh();
    });
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function onClickItem(notif: Notification) {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      void refresh();
    }
    if (notif.payload.ticket_id) {
      setOpen(false);
      router.push(`?ticket=${notif.payload.ticket_id}`);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative inline-grid place-items-center h-9 w-9 rounded-md border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      >
        <Bell size={14} className="text-zinc-700" />
        {unread > 0 ? (
          <span
            className="absolute -top-1 -right-1 inline-grid place-items-center h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[9.5px] font-mono font-semibold brand-glow"
          >
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[360px] rounded-lg border border-zinc-200 bg-white shadow-2xl fade-in">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-zinc-100">
            <div className="text-[10px] uppercase tracking-[0.16em] font-medium text-zinc-500">
              Notifications
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {unread} non lue{unread === 1 ? "" : "s"}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-zinc-500">
                Aucune notification.
              </div>
            ) : (
              items.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => onClickItem(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition ${
                    notif.read ? "" : "bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-blue-700">
                      {TYPE_LABEL[notif.type]}
                    </span>
                    <span className="text-[10.5px] font-mono text-zinc-400 shrink-0">
                      {fmtFR(notif.created_at)}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-zinc-800 leading-relaxed">
                    {notif.payload.message}
                  </div>
                  {!notif.read ? (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10.5px] text-blue-600 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      non lu
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
