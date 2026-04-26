"use client";

import { ChevronDown, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { homeRouteFor, ROLE_USERS, setRoleContext, useRoleContext } from "@/lib/role-context";

const ROLE_LABELS: Record<string, string> = {
  president: "Présidente UCAR",
  staff: "Admin Staff · ENIB",
  director: "Directeur · ENIB",
  dean: "Doyen · Ingénierie",
};

export function RoleSelector() {
  const router = useRouter();
  const ctx = useRoleContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(idx: number) {
    const next = ROLE_USERS[idx];
    setRoleContext(next);
    setOpen(false);
    router.push(homeRouteFor(next.role));
  }

  const currentLabel = ROLE_LABELS[ctx.role] ?? ctx.role;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 h-9 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
      >
        <UserCog size={13} className="text-blue-600" />
        <span className="font-medium truncate max-w-[200px]">{ctx.name}</span>
        <span className="text-zinc-400">·</span>
        <span className="text-zinc-500 truncate max-w-[160px]">
          {currentLabel}
        </span>
        <ChevronDown size={13} className="text-zinc-400" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[300px] rounded-lg border border-zinc-200 bg-white shadow-2xl py-1.5 fade-in">
          <div className="px-3 pt-2 pb-2 text-[10px] uppercase tracking-[0.16em] font-medium text-zinc-500">
            Changer de rôle (démo)
          </div>
          {ROLE_USERS.map((user, idx) => {
            const active =
              user.role === ctx.role && user.user_id === ctx.user_id;
            const label = ROLE_LABELS[user.role] ?? user.role;
            return (
              <button
                key={user.user_id}
                onClick={() => pick(idx)}
                className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50 flex flex-col ${
                  active ? "bg-blue-50/60" : ""
                }`}
              >
                <span className="text-[13px] font-medium text-zinc-900">
                  {user.name}
                </span>
                <span className="text-[11.5px] text-zinc-500">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
