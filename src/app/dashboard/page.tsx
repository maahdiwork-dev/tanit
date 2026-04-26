"use client";

import {
  ArrowDown,
  ArrowRight,
  Building2,
  Coins,
  GraduationCap,
  Microscope,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import {
  exportInstitutionsCsv,
  getAlerts,
  getDashboardSummary,
  getInstitutions,
  getPredictions,
  runMonitor,
} from "@/lib/api";
import { AstariaMark } from "@/components/astaria-mark";
import { ComplianceListSheet } from "@/components/compliance-list-sheet";
import { CycleReportSheet } from "@/components/cycle-report-sheet";
import { DomainCard } from "@/components/domain-card";
import { InstitutionDetailSheet } from "@/components/institution-detail-sheet";
import {
  MonitorButton,
  type MonitorButtonState,
} from "@/components/monitor-button";
import { PredictionDetailSheet } from "@/components/prediction-detail-sheet";
import { Sparkline } from "@/components/sparkline";
import { TanitCard } from "@/components/tanit-card";
import { TanitDock } from "@/components/tanit-dock";
import { fmtFR, fmtNum, metricLabel } from "@/components/tanit-constants";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import type {
  Alert,
  DashboardSummary,
  InstitutionListItem,
  MonitorResponse,
  Prediction,
} from "@/types/api";

const PERIOD = "2024-2025";

type StrategicProject = {
  title: string;
  progress: number;
  period: string;
  owner: string;
};

const STRATEGIC_PROJECTS: StrategicProject[] = [
  {
    title: "Plan GreenMetric · top 500 mondial",
    progress: 35,
    period: "Q2 2026",
    owner: "Cellule durabilité",
  },
  {
    title: "Numérisation des soumissions KPI",
    progress: 80,
    period: "Q1 2026",
    owner: "Plateforme Tanit",
  },
  {
    title: "Cellule développement durable",
    progress: 60,
    period: "Q2 2026",
    owner: "Présidence",
  },
];

const QUICK_NAV = [
  { id: "missions", label: "Missions" },
  { id: "etat", label: "État" },
  { id: "attention", label: "Attention" },
  { id: "domaines", label: "Domaines" },
];

function LoadingBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-md bg-zinc-200/60 animate-pulse ${className}`} />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [monState, setMonState] = useState<MonitorButtonState>("idle");
  const [actionedIds, setActionedIds] = useState<string[]>([]);
  const [openInst, setOpenInst] = useState<InstitutionListItem | null>(null);
  const [openPrediction, setOpenPrediction] = useState<Prediction | null>(null);
  const [openCycle, setOpenCycle] = useState<MonitorResponse | null>(null);
  const [openCompliance, setOpenCompliance] = useState(false);
  const [exportPhase, setExportPhase] = useState<"idle" | "working">("idle");
  const [sheetReloadKey, setSheetReloadKey] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<TanitToastValue>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, institutionData, alertData, predictionData] =
        await Promise.all([
          getDashboardSummary(PERIOD),
          getInstitutions(PERIOD),
          getAlerts(false),
          getPredictions(),
        ]);
      setSummary(summaryData);
      setInstitutions(institutionData);
      setAlerts(alertData);
      setPredictions(predictionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  useEffect(() => {
    const requestedId = searchParams.get("institution");
    if (!requestedId || !institutions.length) return;
    const match = institutions.find((inst) => inst.id === requestedId);
    if (!match) return;

    const timeout = window.setTimeout(() => {
      setOpenInst(match);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("institution");
      const query = params.toString();
      router.replace(query ? `/dashboard?${query}` : "/dashboard", {
        scroll: false,
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [institutions, router, searchParams]);

  async function handleMonitor() {
    if (monState === "running") return;

    setMonState("running");
    try {
      const response = await runMonitor(PERIOD);
      setMonState("success");
      setActionedIds(
        response.newAuditEntries.map((entry) => entry.institutionId),
      );
      setOpenCycle(response);
      setToast({
        title: "Cycle de surveillance terminé",
        body: response.summary,
      });
      await loadDashboard();
      setSheetReloadKey((key) => key + 1);
      window.setTimeout(() => setMonState("idle"), 6000);
    } catch (err) {
      setMonState("idle");
      setToast({
        title: "Erreur de surveillance",
        body: err instanceof Error ? err.message : "Erreur de chargement",
      });
    }
  }

  async function handleExport() {
    if (exportPhase === "working") return;
    setExportPhase("working");
    try {
      const csv = await exportInstitutionsCsv();
      const href = window.URL.createObjectURL(csv.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = csv.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
      setToast({
        title: "Export généré",
        body: `Fichier Excel ${csv.filename} téléchargé.`,
      });
    } catch (err) {
      setToast({
        title: "Erreur d'export",
        body: err instanceof Error ? err.message : "Erreur de chargement",
      });
    } finally {
      setExportPhase("idle");
    }
  }

  const sortedInstitutions = useMemo(() => {
    const arr = [...institutions];
    arr.sort((a, b) => {
      if (a.submissionStatus !== b.submissionStatus) {
        return a.submissionStatus === "missing" ? -1 : 1;
      }
      return a.acronym.localeCompare(b.acronym);
    });
    return arr;
  }, [institutions]);

  const missingInstitutions = useMemo(
    () => sortedInstitutions.filter((i) => i.submissionStatus === "missing"),
    [sortedInstitutions],
  );

  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const firstAlert =
    criticalAlerts.find((alert) => alert.value != null) ??
    alerts.find((alert) => alert.value != null) ??
    criticalAlerts[0] ??
    alerts[0];
  const firstAlertIsNumeric = firstAlert?.value != null;
  const topPrediction = predictions[0];

  const totalInstitutions = summary?.totalInstitutions ?? institutions.length;
  const submittedCount =
    summary?.submittedCount ??
    institutions.filter((inst) => inst.submissionStatus === "submitted").length;
  const missingCount =
    summary?.missingCount ??
    institutions.filter((inst) => inst.submissionStatus === "missing").length;
  const complianceRate =
    summary?.complianceRate ??
    (totalInstitutions > 0
      ? Math.round((submittedCount / totalInstitutions) * 100)
      : 0);

  const tanitQuestion = useMemo(() => {
    if (firstAlert) {
      if (firstAlert.metric === "submission_absence") {
        return `Pourquoi ${firstAlert.institutionAcronym} n'a pas soumis ses KPI pour 2024-2025?`;
      }
      if (firstAlert.value != null && firstAlert.metric === "taux_reussite") {
        return `${firstAlert.institutionAcronym} a un taux de réussite à ${firstAlert.value}%. Que recommandes-tu?`;
      }
      return `Que recommandes-tu concernant ${firstAlert.institutionAcronym}?`;
    }
    if (topPrediction) {
      return `Pourquoi cette tendance baissière sur ${topPrediction.institutionAcronym}?`;
    }
    return "Que voulez-vous savoir sur l'UCAR aujourd'hui?";
  }, [firstAlert, topPrediction]);

  return (
    <div className="px-10 pt-8 pb-20 max-w-[1320px] mx-auto">
      {error ? (
        <button
          onClick={loadDashboard}
          className="mb-6 h-10 px-4 rounded-md border border-red-500/30 bg-red-500/10 text-[13px] text-red-600"
        >
          Erreur de chargement · Réessayer
        </button>
      ) : null}

      {/* ───── Quick-access nav ───── */}
      <nav className="mb-10 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/80 backdrop-blur px-1.5 py-1">
          {QUICK_NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ───────── MISSIONS ───────── */}
      <section id="missions" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Missions
          </div>
          <div className="font-display italic text-[18px] text-zinc-700 mt-1">
            stratégie présidentielle
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* GreenMetric celebration — Astaria territory */}
          <Link href="/greenmetric" className="block group">
            <TanitCard className="relative h-full overflow-hidden bg-astaria-soft transition-all group-hover:shadow-md">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#2D4A35]">
                    GreenMetric · Mission UCAR
                  </div>
                  <div className="font-display italic text-[15px] text-[#2D4A35]/80 mt-1">
                    la victoire à défendre
                  </div>
                </div>
                <div className="rounded-md border border-[#4A7C59]/30 bg-white p-2 text-[#2D4A35]">
                  <Trophy size={16} />
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="font-mono text-[68px] leading-none font-semibold tracking-tight text-[#2D4A35]">
                  #1
                </div>
                <div className="pb-2">
                  <div className="font-display text-[24px] leading-tight font-semibold text-[#2D4A35]">
                    Tunisie
                  </div>
                  <div className="text-[12.5px] text-zinc-700 mt-0.5 font-mono">
                    #688 mondial · Score 6 260
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[13px] text-zinc-700 leading-relaxed">
                Avance nationale +1 240 pts sur le 2ᵉ tunisien.
              </div>

              <div className="mt-5 rounded-lg border border-[#4A7C59]/30 bg-white/80 p-3.5 olive-glow">
                <div className="flex items-center gap-3">
                  <AstariaMark size={32} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-[#2D4A35]">
                      Astaria · Compagnon de mission
                    </div>
                    <div className="text-[11.5px] text-zinc-700 font-mono mt-0.5">
                      3 propositions en attente · top 500 d&apos;ici 2027
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2D4A35] group-hover:text-[#4A7C59]">
                Défendre la place <ArrowRight size={14} />
              </div>
            </TanitCard>
          </Link>

          {/* Strategic Projects — Tanit territory */}
          <TanitCard className="h-full">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-blue-700">
                  Projets stratégiques
                </div>
                <div className="font-display italic text-[15px] text-zinc-700 mt-1">
                  ce qui avance pour vous
                </div>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200">
                {STRATEGIC_PROJECTS.length} en cours
              </span>
            </div>

            <div className="space-y-5">
              {STRATEGIC_PROJECTS.map((project) => (
                <div key={project.title}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="text-[13.5px] text-zinc-900 leading-tight pr-3">
                      {project.title}
                    </div>
                    <div className="font-mono text-[12px] text-blue-700 font-semibold shrink-0">
                      {project.progress}%
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-zinc-500">
                    {project.period} · {project.owner}
                  </div>
                </div>
              ))}
            </div>
          </TanitCard>
        </div>
      </section>

      {/* ───────── ÉTAT ───────── */}
      <section id="etat" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            État des soumissions
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            cycle 2024-2025
          </div>
        </div>

        <TanitCard padded={false} className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr]">
            {/* Left: the metric */}
            <div className="px-8 py-8 lg:border-r border-zinc-100 flex flex-col justify-center">
              {loading ? (
                <LoadingBlock className="h-[80px] w-[160px]" />
              ) : (
                <>
                  <div className="font-mono text-[64px] leading-none font-semibold tracking-tight text-[#297CE9]">
                    {complianceRate}%
                  </div>
                  <div className="text-[14px] text-zinc-700 mt-3">
                    de conformité institutionnelle
                  </div>
                  <div className="text-[12px] text-zinc-500 mt-1 font-mono">
                    {submittedCount} / {totalInstitutions || 33} ont soumis
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-zinc-100 overflow-hidden flex max-w-[280px]">
                    <div
                      style={{ width: `${complianceRate}%` }}
                      className="bg-emerald-500"
                    />
                    <div
                      style={{ width: `${Math.max(0, 100 - complianceRate)}%` }}
                      className="bg-red-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right: missing chips + actions */}
            <div className="px-8 py-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
                <div className="text-[13px] font-medium text-zinc-900">
                  {missingCount} en attente · action requise
                </div>
              </div>

              {!loading && missingInstitutions.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {missingInstitutions.slice(0, 3).map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setOpenInst(inst)}
                      className={`group text-left rounded-lg border bg-white p-3.5 transition-all hover:border-red-400 hover:shadow-sm ${
                        actionedIds.includes(inst.id) && monState !== "idle"
                          ? "border-blue-500/40 fade-in"
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[13.5px] font-semibold text-zinc-950">
                          {inst.acronym}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
                      </div>
                      <div className="text-[10.5px] text-zinc-500 mb-2">
                        {inst.governorate}
                      </div>
                      <div className="text-[10.5px] text-zinc-600 font-mono leading-tight">
                        {inst.lastAction}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {!loading && missingInstitutions.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4 text-[13px] text-emerald-700">
                  Tous les établissements sont à jour.
                </div>
              ) : null}

              <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <MonitorButton
                  state={monState}
                  onClick={handleMonitor}
                  successLabel={`Cycle terminé · ${
                    actionedIds.length || missingCount
                  } actions créées`}
                />
                <button
                  onClick={() => setOpenCompliance(true)}
                  className="text-[12.5px] text-zinc-500 hover:text-blue-600 inline-flex items-center gap-1"
                >
                  Voir tous les {totalInstitutions || 33} établissements →
                </button>
              </div>
            </div>
          </div>
        </TanitCard>
      </section>

      {/* ───────── ATTENTION ───────── */}
      <section id="attention" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Attention
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            ce qui demande votre œil
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Critical alert — red left edge */}
          <TanitCard className="relative h-full border-l-2 border-l-red-500">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-red-700">
                Alerte critique
              </div>
              {alerts.length > 1 ? (
                <button
                  onClick={() => router.push("/alerts")}
                  className="text-[11.5px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Voir {alerts.length} alertes →
                </button>
              ) : null}
            </div>

            {firstAlert ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 border border-red-500/30">
                    {firstAlert.severity === "critical"
                      ? "Critique"
                      : "Avertissement"}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {fmtFR(firstAlert.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[15px] font-semibold text-zinc-950">
                    {firstAlert.institutionAcronym}
                  </span>
                  <span className="text-[12px] text-zinc-600 truncate">
                    {firstAlert.institutionName}
                  </span>
                </div>
                <div className="text-[12.5px] text-zinc-700">
                  {metricLabel(firstAlert.metric)}
                </div>
                {firstAlertIsNumeric ? (
                  <div className="flex items-baseline gap-3 mt-3">
                    <div className="font-mono text-[36px] font-semibold text-red-500 leading-none">
                      {Math.round(firstAlert.value as number)}%
                    </div>
                    <div className="text-[11.5px] text-zinc-600">
                      Seuil{" "}
                      <span className="font-mono text-zinc-800">
                        {firstAlert.threshold}%
                      </span>{" "}
                      · Écart{" "}
                      <span className="font-mono text-red-700">
                        {Math.round(
                          (firstAlert.value as number) -
                            (firstAlert.threshold as number),
                        )}{" "}
                        pts
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="text-[13px] text-zinc-700 italic mt-4 leading-relaxed">
                  {firstAlert.message}
                </div>
              </>
            ) : (
              <div className="border border-dashed border-zinc-200 rounded-md p-6 text-center text-[13px] text-zinc-500">
                Aucune alerte active.
              </div>
            )}
          </TanitCard>

          {/* Top trend — blue left edge */}
          <TanitCard className="relative h-full border-l-2 border-l-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-blue-700" />
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-blue-700">
                  Tendance principale
                </div>
              </div>
              {predictions.length > 1 ? (
                <button
                  onClick={() => setOpenPrediction(predictions[1])}
                  className="text-[11.5px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Voir toutes →
                </button>
              ) : null}
            </div>

            {topPrediction ? (
              <button
                onClick={() => setOpenPrediction(topPrediction)}
                className="w-full text-left rounded-md hover:bg-zinc-50/60 transition -mx-2 px-2 py-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[15px] font-semibold text-zinc-950">
                      {topPrediction.institutionAcronym}
                    </span>
                    <span className="text-[12px] text-zinc-600 truncate">
                      {topPrediction.institutionName}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    {metricLabel(topPrediction.metric)}
                  </span>
                </div>
                <Sparkline
                  data={topPrediction.trendData}
                  predicted={topPrediction.predictedValue}
                  width={320}
                  height={88}
                />
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-mono text-[12px] text-zinc-600">
                    {topPrediction.trendData.map((value, i) => (
                      <span key={i}>
                        <span className="text-zinc-800">{fmtNum(value)}</span>
                        {i < topPrediction.trendData.length - 1 ? (
                          <span className="mx-1 text-zinc-300">→</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <div className="text-[12px] font-mono inline-flex items-center gap-1 text-blue-700 font-semibold">
                    <ArrowDown size={12} />
                    {fmtNum(topPrediction.predictedValue)} prévu en{" "}
                    {topPrediction.predictedPeriod}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10.5px] font-mono mb-1">
                    <span className="text-zinc-500">Confiance</span>
                    <span className="text-zinc-800">
                      {Math.round(topPrediction.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${topPrediction.confidence * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-[13px] text-zinc-700 italic mt-3 leading-relaxed">
                  {topPrediction.message}
                </div>
              </button>
            ) : (
              <div className="border border-dashed border-zinc-200 rounded-md p-6 text-center text-[13px] text-zinc-500">
                Aucune tendance détectée.
              </div>
            )}
          </TanitCard>
        </div>
      </section>

      {/* ───────── DOMAINES ───────── */}
      <section id="domaines" className="mb-2 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Domaines
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            explorer les indicateurs
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DomainCard
            icon={GraduationCap}
            eyebrow="Académique"
            metric={fmtNum(summary?.totalStudents) || "—"}
            metricSub="Étudiants inscrits · 2023"
            href={`/chat?prefill=${encodeURIComponent(
              "Quels sont les indicateurs académiques clés UCAR pour 2024-2025?",
            )}`}
          />
          <DomainCard
            icon={Coins}
            eyebrow="Finances"
            metric="≈ 250 MDT"
            metricSub="Budget UCAR estimé · MESRS 2025"
            href={`/chat?prefill=${encodeURIComponent(
              "Comment se répartit le budget UCAR? Compare avec le national.",
            )}`}
          />
          <DomainCard
            icon={Users}
            eyebrow="RH"
            metric="2 847"
            metricSub="Enseignants · permanents et contractuels"
            href={`/chat?prefill=${encodeURIComponent(
              "Quel est le ratio étudiants/enseignant par établissement?",
            )}`}
          />
          <DomainCard
            icon={Microscope}
            eyebrow="Recherche"
            metric="#863"
            metricSub="URAP rang mondial · 7 335 publications"
            href={`/chat?prefill=${encodeURIComponent(
              "Quelle est la performance recherche UCAR? Compare avec Tunis et Sfax.",
            )}`}
          />
          <DomainCard
            iconNode={<AstariaMark size={28} />}
            eyebrow="ESG · Durabilité"
            metric="#1 TN"
            metricSub="GreenMetric · mission top 500"
            cta="Voir Astaria"
            href="/greenmetric"
            variant="astaria"
          />
          <DomainCard
            icon={Building2}
            eyebrow="Infrastructure"
            metric="33"
            metricSub="Campus UCAR · cartographiés"
            href={`/chat?prefill=${encodeURIComponent(
              "Donne-moi un aperçu de l'infrastructure UCAR par établissement.",
            )}`}
          />
        </div>
      </section>

      {/* Discreet export rail at the bottom */}
      <div className="mt-10 flex justify-end">
        <button
          onClick={handleExport}
          disabled={exportPhase === "working"}
          className="text-[11.5px] text-zinc-500 hover:text-blue-600 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {exportPhase === "working"
            ? "Export en cours…"
            : "Exporter les établissements (Excel)"}
        </button>
      </div>

      {/* ───── Sheets + Dock ───── */}
      <InstitutionDetailSheet
        inst={openInst}
        onClose={() => setOpenInst(null)}
        reloadKey={sheetReloadKey}
      />
      <PredictionDetailSheet
        prediction={openPrediction}
        onClose={() => setOpenPrediction(null)}
      />
      <CycleReportSheet
        cycle={openCycle}
        onClose={() => setOpenCycle(null)}
      />
      <ComplianceListSheet
        open={openCompliance}
        onClose={() => setOpenCompliance(false)}
        institutions={sortedInstitutions}
        onSelect={(inst) => setOpenInst(inst)}
      />
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
      <TanitDock question={tanitQuestion} />
    </div>
  );
}
