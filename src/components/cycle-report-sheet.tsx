"use client";

import { ArrowRight, Check, Download, FileText, Radar, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { generateCycleReport } from "@/lib/api";
import { fmtFR } from "@/components/tanit-constants";
import type { MonitorResponse } from "@/types/api";

export function CycleReportSheet({
  cycle,
  onClose,
}: {
  cycle: MonitorResponse | null;
  onClose: () => void;
}) {
  const [downloadPhase, setDownloadPhase] = useState<"idle" | "working">(
    "idle",
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cycle) return;
    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [cycle, onClose]);

  if (!cycle) return null;

  const actionedResults = cycle.perInstitutionResults.filter(
    (result) => result.actionTaken,
  );
  const terminalResults = cycle.perInstitutionResults.filter(
    (result) => !result.actionTaken,
  );
  const allTerminal = cycle.actionsCreated === 0 && cycle.missingFound > 0;

  async function downloadPdf() {
    if (!cycle || downloadPhase === "working") return;
    setDownloadPhase("working");
    setDownloadError(null);
    try {
      const report = await generateCycleReport(cycle);
      const href = window.URL.createObjectURL(report.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Erreur de génération",
      );
    } finally {
      setDownloadPhase("idle");
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <aside
          className="modal-in relative w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-2xl pointer-events-auto"
          role="dialog"
          aria-modal="true"
        >
      <div className="px-7 py-6 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <Radar size={12} className="text-blue-600" />
            <span>Cycle de surveillance</span>
            <span className="text-zinc-300">/</span>
            <span>{cycle.cycleId.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-1 -m-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="text-[20px] font-semibold tracking-tight text-zinc-950">
          Rapport du cycle de surveillance
        </div>
        <div className="text-[12px] text-zinc-500 font-mono mt-1">
          {fmtFR(cycle.finishedAt)}
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-4">
          Synthèse
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="font-mono text-[26px] font-semibold leading-none text-zinc-950">
              {cycle.checked}
            </div>
            <div className="text-[11.5px] text-zinc-600 mt-2 leading-tight">
              Établissements vérifiés
            </div>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="font-mono text-[26px] font-semibold leading-none text-red-600">
              {cycle.missingFound}
            </div>
            <div className="text-[11.5px] text-zinc-600 mt-2 leading-tight">
              Manquants détectés
            </div>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="font-mono text-[26px] font-semibold leading-none text-blue-600">
              {cycle.actionsCreated}
            </div>
            <div className="text-[11.5px] text-zinc-600 mt-2 leading-tight">
              Nouvelles actions créées
            </div>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="font-mono text-[26px] font-semibold leading-none text-amber-700">
              {cycle.newAlertsCount}
            </div>
            <div className="text-[11.5px] text-zinc-600 mt-2 leading-tight">
              Alerte
              {cycle.newAlertsCount === 1 ? "" : "s"} critique
              {cycle.newAlertsCount === 1 ? "" : "s"} générée
              {cycle.newAlertsCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {actionedResults.length > 0 ? (
        <div className="px-7 py-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
              Actions par établissement
            </div>
            <span className="h-px bg-zinc-200 flex-1" />
            <span className="text-[10px] font-mono text-zinc-500">
              {actionedResults.length}
            </span>
          </div>
          <div className="space-y-3">
            {actionedResults.map((result) => (
              <div
                key={result.institutionId}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-zinc-950">
                      {result.institutionAcronym}
                    </span>
                    {result.governorate ? (
                      <span className="text-[11px] text-zinc-500">
                        · {result.governorate}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-700 shrink-0">
                    {result.actionLabel}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-700 leading-relaxed">
                  {result.institutionName}
                </div>
                {result.notes ? (
                  <div className="text-[11.5px] text-zinc-600 mt-2 leading-relaxed flex items-start gap-1.5">
                    <ArrowRight
                      size={11}
                      className="text-zinc-400 mt-0.5 shrink-0"
                    />
                    <span>{result.notes}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {allTerminal ? (
        <div className="px-7 py-6 border-b border-zinc-100">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-500/15 grid place-items-center text-emerald-700 shrink-0">
                <Check size={14} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-emerald-700">
                  Système à jour
                </div>
                <div className="text-[12px] text-zinc-700 mt-1 leading-relaxed">
                  Toutes les institutions manquantes ont déjà été notifiées et
                  escaladées. Aucune nouvelle action requise.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {terminalResults.length > 0 && !allTerminal ? (
        <div className="px-7 py-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
              Déjà escaladé
            </div>
            <span className="h-px bg-zinc-200 flex-1" />
            <span className="text-[10px] font-mono text-zinc-500">
              {terminalResults.length}
            </span>
          </div>
          <div className="text-[12px] text-zinc-600 leading-relaxed">
            {terminalResults.map((result) => result.institutionAcronym).join(" · ")}
            {" — "}
            <span className="text-zinc-500">aucune nouvelle action requise.</span>
          </div>
        </div>
      ) : null}

      <div className="px-7 py-6">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-3">
          {cycle.conformInstitutionsCount} établissement
          {cycle.conformInstitutionsCount === 1 ? "" : "s"} conforme
          {cycle.conformInstitutionsCount === 1 ? "" : "s"}
        </div>
        <div className="text-[12px] text-zinc-600 leading-relaxed">
          Aucune action requise pour les établissements à jour.
        </div>
      </div>

      {downloadError ? (
        <div className="mx-7 mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-600">
          {downloadError}
        </div>
      ) : null}

      <div className="px-7 py-5 border-t border-zinc-200 sticky bottom-0 bg-white/95 backdrop-blur flex flex-col gap-2">
        <button
          onClick={downloadPdf}
          disabled={downloadPhase === "working"}
          className="w-full h-11 rounded-md text-white font-medium text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-70 brand-glow"
          style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
        >
          {downloadPhase === "working" ? (
            <>
              <span className="radar-sweep inline-block">
                <Radar size={15} />
              </span>
              Tanit assemble le PDF…
            </>
          ) : (
            <>
              <Download size={15} /> Télécharger le rapport (PDF)
            </>
          )}
        </button>
        <Link
          href="/audit"
          onClick={onClose}
          className="w-full h-10 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-[12.5px] text-zinc-700 font-medium inline-flex items-center justify-center gap-2"
        >
          <FileText size={13} /> Voir le journal d&apos;audit complet →
        </Link>
      </div>
        </aside>
      </div>
    </>
  );
}
