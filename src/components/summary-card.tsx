import type { ReactNode } from "react";

import { TanitCard } from "@/components/tanit-card";

export function SummaryCard({
  label,
  value,
  accent,
  sub,
  subAccent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: ReactNode;
  subAccent?: string;
  hint?: string;
}) {
  return (
    <TanitCard>
      <div className="flex items-start justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
          {label}
        </div>
        {hint ? (
          <div className="text-[10px] text-zinc-400 font-mono">{hint}</div>
        ) : null}
      </div>
      <div
        className={`text-[36px] leading-none font-semibold tracking-tight ${
          accent || "text-zinc-950"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div
          className={`text-[12px] mt-3 flex items-center gap-1.5 ${
            subAccent || "text-zinc-600"
          }`}
        >
          {sub}
        </div>
      ) : null}
    </TanitCard>
  );
}
