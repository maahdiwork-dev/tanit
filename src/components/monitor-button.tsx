"use client";

import { Check, Radar } from "lucide-react";

export type MonitorButtonState = "idle" | "running" | "success";

export function MonitorButton({
  state,
  onClick,
  successLabel = "Cycle terminé · 3 actions créées",
}: {
  state: MonitorButtonState;
  onClick: () => void;
  successLabel?: string;
}) {
  if (state === "idle") {
    return (
      <button
        onClick={onClick}
        className="group relative inline-flex items-center gap-2.5 h-11 px-5 rounded-md text-white font-medium text-[14px] transition shadow-[0_0_0_1px_rgba(41,124,233,.4),0_8px_24px_-8px_rgba(41,124,233,.6)] hover:shadow-[0_0_0_1px_rgba(41,124,233,.6),0_8px_28px_-6px_rgba(41,124,233,.8)]"
        style={{
          background:
            "linear-gradient(180deg,#3b82f6 0%, #297CE9 50%, #1B487E 100%)",
        }}
      >
        <Radar size={17} />
        <span>Lancer le cycle de surveillance</span>
        <span className="font-mono text-[10px] opacity-70 ml-1 border border-white/30 rounded px-1.5 py-0.5">
          ⌘ R
        </span>
      </button>
    );
  }

  if (state === "running") {
    return (
      <button
        disabled
        className="relative inline-flex items-center gap-2.5 h-11 px-5 rounded-md text-white font-medium text-[14px] bg-blue-600/90 border border-blue-500/40"
      >
        <span className="relative w-4 h-4 inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full ring-expand bg-blue-300/40" />
          <Radar size={15} className="radar-sweep relative" />
        </span>
        <span>Surveillance en cours…</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2.5 h-11 px-5 rounded-md text-white font-medium text-[14px] bg-emerald-600 border border-emerald-500/50"
    >
      <Check size={17} />
      <span>{successLabel}</span>
    </button>
  );
}
