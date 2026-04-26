"use client";

import { ChevronRight } from "lucide-react";

import type { InstitutionListItem } from "@/types/api";

export function InstitutionRow({
  inst,
  onClick,
  justActioned,
}: {
  inst: InstitutionListItem;
  onClick: () => void;
  justActioned?: boolean;
}) {
  const status = inst.submissionStatus;
  const dotColor = status === "submitted" ? "bg-emerald-500" : "bg-red-500";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-3 h-12 rounded-md hover:bg-zinc-100/80 transition group text-left relative"
    >
      <span
        className={`w-2 h-2 rounded-full ${dotColor} ${
          status === "missing" ? "pulse-dot" : ""
        }`}
      />
      <span className="font-mono text-[12.5px] text-zinc-900 w-[78px] tracking-tight">
        {inst.acronym}
      </span>
      <span className="text-[13px] text-zinc-700 flex-1 truncate">
        {inst.name_fr}
      </span>
      <span className="text-[11px] text-zinc-500 hidden lg:block">
        {inst.governorate}
      </span>
      <span className="text-[11.5px] text-zinc-500 font-mono whitespace-nowrap">
        {inst.lastAction}
      </span>
      {status === "missing" ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:text-blue-700">
          Détails <ChevronRight size={11} />
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 group-hover:text-blue-600 transition-colors">
          <ChevronRight size={12} />
        </span>
      )}
      {justActioned ? (
        <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500 fade-in" />
      ) : null}
    </button>
  );
}
