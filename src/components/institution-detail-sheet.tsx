"use client";

import { Radar, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getInstitutionDetail, sendManualReminder } from "@/lib/api";
import { AuditTimeline } from "@/components/audit-timeline";
import { SideSheet } from "@/components/side-sheet";
import { StatusPill } from "@/components/status-pill";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import { fmtNum, metricLabel } from "@/components/tanit-constants";
import type {
  InstitutionDetail,
  InstitutionListItem,
  SubmissionStatus,
} from "@/types/api";

export function InstitutionDetailSheet({
  inst,
  onClose,
  reloadKey = 0,
}: {
  inst: InstitutionListItem | null;
  onClose: () => void;
  reloadKey?: number;
}) {
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [reminderPhase, setReminderPhase] = useState<"idle" | "working">(
    "idle",
  );
  const [toast, setToast] = useState<TanitToastValue>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!inst) {
        setDetail(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getInstitutionDetail(inst.id);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erreur de chargement",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [inst, reloadKey, retryKey]);

  async function handleManualReminder() {
    if (!inst || reminderPhase === "working") return;
    setReminderPhase("working");
    try {
      await sendManualReminder(inst.id);
      setToast({
        title: "Rappel manuel envoyé",
        body: `Notification transmise à ${inst.acronym}.`,
      });
      setRetryKey((key) => key + 1);
    } catch (err) {
      setToast({
        title: "Erreur",
        body: err instanceof Error ? err.message : "Impossible d'envoyer",
      });
    } finally {
      setReminderPhase("idle");
    }
  }

  if (!inst) return null;

  const institution = detail?.institution ?? inst;
  const status =
    detail?.submission.status ?? inst.submissionStatus ?? "missing";
  const audit = detail?.auditTrail ?? [];
  const kpis = detail?.kpis ?? [];

  return (
    <SideSheet open={true} onClose={onClose}>
      <div className="px-7 py-6 border-b border-zinc-200/80 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>UCAR · {institution.code}</span>
            <span className="text-zinc-300">/</span>
            <span>{institution.governorate}</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 p-1 -m-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className="font-mono text-[26px] font-semibold text-zinc-950 tracking-tight">
            {institution.acronym}
          </div>
          <StatusPill status={status as SubmissionStatus} />
        </div>
        <div className="text-[14px] text-zinc-700">{institution.name_fr}</div>
        {institution.name_ar ? (
          <div className="text-[12px] text-zinc-500 mt-0.5" dir="rtl">
            {institution.name_ar}
          </div>
        ) : null}
      </div>

      <div className="px-7 py-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
            Historique Tanit
          </div>
          <span className="h-px bg-zinc-100 flex-1" />
          <span className="text-[10px] font-mono text-zinc-400">
            {audit.length} événements
          </span>
        </div>
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 rounded-md bg-zinc-200/60 animate-pulse" />
            <div className="h-12 rounded-md bg-zinc-200/60 animate-pulse" />
            <div className="h-12 rounded-md bg-zinc-200/60 animate-pulse" />
          </div>
        ) : error ? (
          <button
            onClick={() => setRetryKey((key) => key + 1)}
            className="text-[12px] text-red-600"
          >
            Erreur de chargement · Réessayer
          </button>
        ) : audit.length ? (
          <AuditTimeline entries={audit} />
        ) : (
          <div className="text-[12px] text-zinc-500">
            Aucun événement · établissement à jour.
          </div>
        )}
      </div>

      <div className="px-7 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
            KPIs disponibles
          </div>
          <span className="h-px bg-zinc-100 flex-1" />
        </div>
        {loading ? (
          <div className="h-28 rounded-md bg-zinc-200/60 animate-pulse" />
        ) : kpis.length ? (
          <div className="space-y-1">
            {kpis.map((kpi, i) => {
              const label = metricLabel(kpi.metric);
              return (
                <div
                  key={`${kpi.metric}-${i}`}
                  className="flex items-center justify-between px-3 h-10 rounded-md border border-zinc-200/70 bg-white/50"
                >
                  <div className="text-[12.5px] text-zinc-700">{label}</div>
                  <div className="font-mono text-[13px] text-zinc-900">
                    {fmtNum(kpi.value)}
                    {label.includes("Taux") ? "%" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-md p-4">
            <div className="text-[12.5px] text-zinc-700">
              Données en attente de soumission.
            </div>
            <div className="text-[11.5px] text-zinc-500 mt-1">
              Tanit collecte ces indicateurs auprès de l&apos;établissement.
            </div>
          </div>
        )}
      </div>

      <div className="px-7 py-5 border-t border-zinc-200 sticky bottom-0 bg-white/95 backdrop-blur flex gap-2">
        <button
          onClick={handleManualReminder}
          disabled={reminderPhase === "working"}
          className="flex-1 h-10 rounded-md border border-zinc-300 bg-zinc-100/80 hover:bg-zinc-50 text-[13px] text-zinc-800 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {reminderPhase === "working" ? (
            <>
              <span className="radar-sweep inline-block">
                <Radar size={13} />
              </span>
              Envoi du rappel…
            </>
          ) : (
            <>
              <Send size={13} /> Envoyer un rappel manuel
            </>
          )}
        </button>
      </div>
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </SideSheet>
  );
}
