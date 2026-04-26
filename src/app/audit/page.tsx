"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAudit, getInstitutions } from "@/lib/api";
import { TanitCard } from "@/components/tanit-card";
import {
  ACTION_COLORS,
  ACTION_LABELS,
  fmtFR,
} from "@/components/tanit-constants";
import { Topbar } from "@/components/topbar";
import type { AuditLogEntry, InstitutionListItem } from "@/types/api";

type ActionFilter = "all" | "reminder_sent" | "submission_validated" | "anomaly_detected";

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([]);
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditData, institutionData] = await Promise.all([
        getAudit({ limit: 100 }),
        getInstitutions("2024-2025"),
      ]);
      setEntries(auditData);
      setInstitutions(institutionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAudit();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadAudit]);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const institutionMatch =
          institutionFilter === "all" ||
          entry.targetAcronym === institutionFilter ||
          entry.target === institutionFilter;
        const actionMatch =
          actionFilter === "all" || entry.action === actionFilter;

        return institutionMatch && actionMatch;
      }),
    [entries, institutionFilter, actionFilter],
  );

  return (
    <div className="px-10 pt-8 pb-16 max-w-[1280px] mx-auto">
      <Topbar
        eyebrow="Traçabilité · journal immutable"
        title="Journal d'audit"
        subtitle="Toutes les actions de Tanit et des utilisateurs UCAR · cryptographiquement signées"
      />
      <div className="flex items-center gap-2 mb-4">
        <select
          value={institutionFilter}
          onChange={(event) => setInstitutionFilter(event.target.value)}
          className="h-9 px-3 rounded-md bg-white border border-zinc-200 text-[12.5px] text-zinc-700"
        >
          <option value="all">Tous les établissements</option>
          {institutions.slice(0, 8).map((institution) => (
            <option key={institution.id} value={institution.acronym}>
              {institution.acronym}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
          className="h-9 px-3 rounded-md bg-white border border-zinc-200 text-[12.5px] text-zinc-700"
        >
          <option value="all">Toutes les actions</option>
          <option value="reminder_sent">Rappels</option>
          <option value="submission_validated">Soumissions</option>
          <option value="anomaly_detected">Anomalies</option>
        </select>
        <div className="ml-auto text-[12px] font-mono text-zinc-500">
          {filtered.length} événements · derniers 7 jours
        </div>
      </div>

      {error ? (
        <button
          onClick={loadAudit}
          className="mb-6 h-10 px-4 rounded-md border border-red-500/30 bg-red-500/10 text-[13px] text-red-600"
        >
          Erreur de chargement · Réessayer
        </button>
      ) : null}

      <TanitCard padded={false}>
        <div className="grid grid-cols-[150px_220px_180px_100px_1fr] px-5 py-3 border-b border-zinc-100 text-[10.5px] uppercase tracking-wider text-zinc-500 font-medium">
          <div>Horodatage</div>
          <div>Acteur</div>
          <div>Action</div>
          <div>Cible</div>
          <div>Détails</div>
        </div>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[49px] border-b border-zinc-100/60 bg-zinc-100/70 animate-pulse"
            />
          ))
        ) : filtered.length ? (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[150px_220px_180px_100px_1fr] px-5 py-3.5 border-b border-zinc-100/60 hover:bg-zinc-100/70 items-center"
            >
              <div className="text-[11.5px] font-mono text-zinc-500">
                {fmtFR(entry.createdAt)}
              </div>
              <div className="text-[12.5px] text-zinc-700 truncate">
                {entry.actor}
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                    ACTION_COLORS[entry.action] ||
                    "text-zinc-600 border-zinc-300"
                  }`}
                >
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
              </div>
              <div className="font-mono text-[12.5px] text-zinc-900">
                {entry.targetAcronym || entry.target}
              </div>
              <div className="text-[12.5px] text-zinc-600 truncate">
                {entry.details}
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-[13px] text-zinc-500">
            Aucun événement · établissement à jour.
          </div>
        )}
      </TanitCard>
    </div>
  );
}
