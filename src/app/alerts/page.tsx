"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getAlerts, resolveAlert } from "@/lib/api";
import { DomainEmptyState } from "@/components/domain-empty-state";
import { TanitCard } from "@/components/tanit-card";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import { fmtFR, metricLabel } from "@/components/tanit-constants";
import { Topbar } from "@/components/topbar";
import type { Alert, AlertSeverity } from "@/types/api";

function questionForAlert(alert: Alert) {
  if (alert.metric === "submission_absence") {
    return `Pourquoi ${alert.institutionAcronym} n'a pas soumis ses KPIs pour la période 2024-2025 et que recommandes-tu?`;
  }
  if (alert.metric === "taux_reussite" && alert.value != null) {
    return `${alert.institutionAcronym} a un taux de réussite de ${alert.value}%. Quelles actions stratégiques recommandes-tu?`;
  }
  return `Que recommandes-tu concernant l'alerte sur ${alert.institutionAcronym} : ${alert.message}?`;
}

const SEVERITY: Record<
  AlertSeverity,
  { label: string; color: string; pill: string }
> = {
  critical: {
    label: "Critique",
    color: "border-red-500",
    pill: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  warning: {
    label: "Avertissement",
    color: "border-amber-500",
    pill: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  info: {
    label: "Info",
    color: "border-blue-500",
    pill: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
};

export default function AlertsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<TanitToastValue>(null);

  async function askTanit(alert: Alert) {
    const question = questionForAlert(alert);
    router.push(`/chat?prefill=${encodeURIComponent(question)}`);
  }

  function viewInstitution(alert: Alert) {
    router.push(
      `/dashboard?institution=${encodeURIComponent(alert.institutionId)}`,
    );
  }

  async function markResolved(alert: Alert) {
    if (resolvingIds.has(alert.id)) return;
    setResolvingIds((prev) => new Set(prev).add(alert.id));
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a)),
    );
    try {
      await resolveAlert(alert.id);
      setToast({
        title: "Alerte marquée comme résolue",
        body: `${alert.institutionAcronym} · ${metricLabel(alert.metric)}`,
      });
      window.setTimeout(() => {
        void loadAlerts();
      }, 1000);
    } catch (err) {
      // Revert optimistic update
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, resolved: false } : a)),
      );
      setToast({
        title: "Erreur",
        body: err instanceof Error ? err.message : "Impossible de résoudre",
      });
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  }

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAlerts(await getAlerts(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAlerts();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadAlerts]);

  const filtered = useMemo(
    () =>
      alerts
        .filter((alert) => !alert.resolved)
        .filter((alert) => filter === "all" || alert.severity === filter),
    [alerts, filter],
  );

  return (
    <div className="px-10 pt-8 pb-16 max-w-[1280px] mx-auto">
      <Topbar
        eyebrow="Surveillance · Anomalies détectées"
        title="Alertes intelligentes"
        subtitle="Anomalies détectées par Tanit sur les KPIs des 33 établissements"
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-md">
          {[
            ["all", "Toutes"],
            ["critical", "Critiques"],
            ["warning", "Avertissements"],
            ["info", "Info"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key as "all" | AlertSeverity)}
              className={`h-8 px-3 rounded text-[12px] font-medium transition ${
                filter === key
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-[12px] font-mono text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "alerte" : "alertes"}
        </div>
      </div>

      {error ? (
        <button
          onClick={loadAlerts}
          className="mb-6 h-10 px-4 rounded-md border border-red-500/30 bg-red-500/10 text-[13px] text-red-600"
        >
          Erreur de chargement · Réessayer
        </button>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[148px] rounded-lg bg-zinc-200/60 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const severity = SEVERITY[alert.severity];
            const isNumeric = alert.value != null;

            return (
              <TanitCard
                key={alert.id}
                className={`border-l-2 ${severity.color}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${severity.pill}`}
                    >
                      {severity.label}
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-zinc-900">
                      {alert.institutionAcronym}
                    </span>
                    <span className="text-[12px] text-zinc-500">
                      · {alert.institutionName}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {fmtFR(alert.createdAt)}
                  </span>
                </div>
                {isNumeric ? (
                  <div className="flex items-baseline gap-4">
                    <div className="text-[13px] text-zinc-700">
                      {metricLabel(alert.metric)}
                    </div>
                    <div
                      className={`text-[24px] font-semibold leading-none ${
                        alert.severity === "critical"
                          ? "text-red-500"
                          : alert.severity === "warning"
                            ? "text-amber-500"
                            : "text-blue-600"
                      }`}
                    >
                      {alert.value}
                      {typeof alert.value === "number" &&
                      alert.value < 100 &&
                      alert.metric.toLowerCase().includes("taux")
                        ? "%"
                        : ""}
                    </div>
                    <div className="text-[12px] text-zinc-500">
                      Seuil{" "}
                      <span className="font-mono text-zinc-700">
                        {alert.threshold}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-zinc-700">
                    {metricLabel(alert.metric)}
                  </div>
                )}
                <div className="text-[12.5px] text-zinc-700 italic mt-2 leading-relaxed">
                  {alert.message}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => markResolved(alert)}
                    disabled={resolvingIds.has(alert.id)}
                    className="h-8 px-3 rounded-md border border-zinc-200 hover:border-zinc-300 text-[12px] text-zinc-700 disabled:opacity-60"
                  >
                    {resolvingIds.has(alert.id)
                      ? "Résolution…"
                      : "Marquer résolue"}
                  </button>
                  <button
                    onClick={() => viewInstitution(alert)}
                    className="h-8 px-3 rounded-md border border-zinc-200 hover:border-zinc-300 text-[12px] text-zinc-700"
                  >
                    Voir établissement
                  </button>
                  <button
                    onClick={() => askTanit(alert)}
                    className="h-8 px-3 rounded-md text-[12px] text-blue-600 hover:bg-blue-500/10"
                  >
                    Demander à Tanit →
                  </button>
                </div>
              </TanitCard>
            );
          })}
        </div>
      ) : (
        <TanitCard padded={false}>
          <DomainEmptyState domain="alertes" />
        </TanitCard>
      )}
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
