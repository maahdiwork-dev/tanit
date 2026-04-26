import { Check } from "lucide-react";

import { ACTION_LABELS, fmtFR } from "@/components/tanit-constants";
import type { AuditTrailEntry } from "@/types/api";

export function AuditTimeline({ entries }: { entries: AuditTrailEntry[] }) {
  return (
    <ol className="relative">
      {entries.map((entry, i) => {
        const last = i === entries.length - 1;
        const done = entry.action !== "escalation_pending";
        const ringClass = done
          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600"
          : "bg-blue-500/10 border-blue-500 text-blue-600";

        return (
          <li key={entry.id} className="relative pl-9 pb-6 last:pb-0">
            {!last && (
              <span className="absolute left-[11px] top-5 bottom-0 w-px bg-zinc-100" />
            )}
            <span
              className={`absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full grid place-items-center border-2 ${ringClass}`}
            >
              {done ? (
                <Check size={11} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-dot" />
              )}
            </span>
            <div className="text-[13px] font-medium text-zinc-900">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </div>
            <div className="text-[12px] text-zinc-600 mt-0.5 leading-relaxed pr-2">
              {entry.details}
            </div>
            <div className="text-[10.5px] text-zinc-400 font-mono mt-1.5 flex items-center gap-2">
              <span>{entry.actor}</span>
              <span className="text-zinc-300">·</span>
              <span>{fmtFR(entry.createdAt)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
