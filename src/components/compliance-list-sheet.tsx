"use client";

import { Building2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { InstitutionRow } from "@/components/institution-row";
import { SideSheet } from "@/components/side-sheet";
import type { InstitutionListItem } from "@/types/api";

type Filter = "all" | "missing" | "submitted";

export function ComplianceListSheet({
  open,
  onClose,
  institutions,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  institutions: InstitutionListItem[];
  onSelect: (inst: InstitutionListItem) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const submitted = institutions.filter(
      (i) => i.submissionStatus === "submitted",
    ).length;
    const missing = institutions.filter(
      (i) => i.submissionStatus === "missing",
    ).length;
    return { all: institutions.length, submitted, missing };
  }, [institutions]);

  const visible = useMemo(() => {
    const arr = [...institutions];
    arr.sort((a, b) => {
      if (a.submissionStatus !== b.submissionStatus) {
        return a.submissionStatus === "missing" ? -1 : 1;
      }
      return a.acronym.localeCompare(b.acronym);
    });
    if (filter === "all") return arr;
    return arr.filter((i) => i.submissionStatus === filter);
  }, [institutions, filter]);

  return (
    <SideSheet open={open} onClose={onClose}>
      <div className="px-7 py-6 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <Building2 size={12} className="text-blue-600" />
            <span>Conformité des soumissions</span>
            <span className="text-zinc-300">/</span>
            <span>2024-2025</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-1 -m-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="text-[20px] font-semibold tracking-tight text-zinc-950">
          Tous les établissements UCAR
        </div>
        <div className="text-[12px] text-zinc-500 mt-1">
          {counts.all} établissements ·{" "}
          <span className="text-emerald-700 font-mono">
            {counts.submitted} conformes
          </span>{" "}
          ·{" "}
          <span className="text-red-600 font-mono">
            {counts.missing} en attente
          </span>
        </div>
        <div className="mt-4 inline-flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-md">
          {(
            [
              ["all", "Tous", counts.all],
              ["missing", "Manquants", counts.missing],
              ["submitted", "Soumis", counts.submitted],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`h-7 px-2.5 rounded text-[11.5px] font-medium transition inline-flex items-center gap-1.5 ${
                filter === key
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-800"
              }`}
            >
              {label}
              <span className="text-[10px] font-mono text-zinc-500">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-2">
        {visible.length ? (
          visible.map((inst) => (
            <InstitutionRow
              key={inst.id}
              inst={inst}
              onClick={() => {
                onSelect(inst);
                onClose();
              }}
            />
          ))
        ) : (
          <div className="px-4 py-12 text-center text-[13px] text-zinc-500">
            Aucun établissement dans cette catégorie.
          </div>
        )}
      </div>
    </SideSheet>
  );
}
