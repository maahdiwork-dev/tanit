"use client";

import { Download, Radar, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AstariaChatSheet } from "@/components/astaria-chat-sheet";
import { AstariaMark } from "@/components/astaria-mark";
import { CategoryDetailSheet } from "@/components/category-detail-sheet";
import { GreenMetricCategoryCard } from "@/components/greenmetric-category-card";
import { GreenMetricComparisonTable } from "@/components/greenmetric-comparison-table";
import {
  GreenMetricPhaseCard,
  type GreenMetricPhase,
} from "@/components/greenmetric-phase-card";
import { TanitCard } from "@/components/tanit-card";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import {
  generateGreenMetricStrategy,
  getGreenMetricSummary,
} from "@/lib/api";
import type {
  GreenMetricCategory,
  GreenMetricCategoryCode,
  GreenMetricSummary,
} from "@/types/api";

const phases: GreenMetricPhase[] = [
  {
    phase: "Phase 1",
    title: "Politiques et gains rapides",
    period: "Mois 1-3",
    points: 300,
    actions: [
      {
        label: "Interdiction du plastique à usage unique (décret UCAR)",
        impact: "WS.2 +200 pts",
        cost: "0 TND",
      },
      {
        label: "Bacs de tri colorés dans les 33 établissements",
        impact: "WS.1 + WS.4 +150 pts",
        cost: "100K TND",
      },
      {
        label: "Programme de tests de qualité de l'eau (FSB)",
        impact: "WR.5 +150 pts",
        cost: "15K TND/an",
      },
      {
        label: "Formalisation cellule coordination développement durable",
        impact: "ED.13 +30 pts",
        cost: "0 TND",
      },
      {
        label: "Cartographie standardisée des 33 campus",
        impact: "SI.1-5 +100 pts",
        cost: "30K TND",
      },
    ],
  },
  {
    phase: "Phase 2",
    title: "Infrastructure",
    period: "Mois 4-8",
    points: 400,
    actions: [
      {
        label: "Robinetterie économe (15 établissements pilotes)",
        impact: "WR.3 +100 pts",
        cost: "75K TND",
      },
      {
        label: "Récupération d'eau de pluie (10 établissements)",
        impact: "WR.2 +100 pts",
        cost: "100K TND",
      },
      {
        label: "Compostage cafétérias (10 plus grands établissements)",
        impact: "WS.3 +200 pts",
        cost: "50K TND",
      },
      {
        label: "Trous d'infiltration (volontaires étudiants)",
        impact: "WR.1 + SI.4 +50 pts",
        cost: "5K TND",
      },
      {
        label: "Collecte certifiée des e-déchets (UCAR)",
        impact: "WS.5 +200 pts",
        cost: "10K TND/an",
      },
    ],
  },
  {
    phase: "Phase 3",
    title: "Mesure et reporting",
    period: "Mois 9-12",
    points: 240,
    actions: [
      {
        label: "Compteurs intelligents énergie (10 établissements)",
        impact: "EC.4 + EC.11 +100 pts",
        cost: "100K TND",
      },
      {
        label: "Audit complet des déchets",
        impact: "Base WS +100 pts",
        cost: "20K TND",
      },
      {
        label: "Formation 33 référents GreenMetric",
        impact: "Qualité dossier +40 pts",
        cost: "5K TND",
      },
    ],
  },
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  })
    .format(value)
    .replace(/[\u202f\u00a0]/g, " ");
}

function LoadingBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/60 ${className}`} />;
}

function StrategyButton({
  phase,
  onClick,
  className = "",
}: {
  phase: "idle" | "working";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={phase === "working"}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-[13px] font-semibold text-white shadow-lg shadow-emerald-950/20 transition-opacity disabled:opacity-70 olive-glow ${className}`}
      style={{ background: "linear-gradient(180deg,#4A7C59, #2D4A35)" }}
    >
      {phase === "working" ? (
        <>
          <span className="radar-sweep inline-block">
            <Radar size={15} />
          </span>
          Génération du plan...
        </>
      ) : (
        <>
          <Download size={16} />
          Générer le plan stratégique
        </>
      )}
    </button>
  );
}

export default function GreenMetricPage() {
  return (
    <Suspense fallback={null}>
      <GreenMetricPageInner />
    </Suspense>
  );
}

function GreenMetricPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<GreenMetricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadPhase, setDownloadPhase] = useState<"idle" | "working">("idle");
  const [toast, setToast] = useState<TanitToastValue>(null);
  const [openCategory, setOpenCategory] =
    useState<GreenMetricCategory | null>(null);
  const [highlightedCode, setHighlightedCode] =
    useState<GreenMetricCategoryCode | null>(null);
  const [astariaOpen, setAstariaOpen] = useState(false);
  const categoryRefs = useRef<
    Partial<Record<GreenMetricCategoryCode, HTMLDivElement | null>>
  >({});

  // Prefill events fired from category-detail-sheet's "Demander à Astaria" CTA
  // should also auto-open the chat sheet.
  useEffect(() => {
    function onPrefill() {
      setAstariaOpen(true);
    }
    window.addEventListener("astaria_prefill", onPrefill);
    return () => window.removeEventListener("astaria_prefill", onPrefill);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getGreenMetricSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSummary();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadSummary]);

  useEffect(() => {
    const requested = searchParams.get("category");
    if (!requested || !summary) return;
    const code = requested as GreenMetricCategoryCode;
    const target = categoryRefs.current[code];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCode(code);
      const ttl = window.setTimeout(() => setHighlightedCode(null), 2000);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      const query = params.toString();
      router.replace(query ? `/greenmetric?${query}` : "/greenmetric", {
        scroll: false,
      });
      return () => window.clearTimeout(ttl);
    }
  }, [router, searchParams, summary]);

  async function generatePlan() {
    if (downloadPhase === "working") return;

    setDownloadPhase("working");
    setError(null);
    try {
      const report = await generateGreenMetricStrategy();
      const href = window.URL.createObjectURL(report.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
      setToast({
        title: "Plan stratégique généré",
        body: "Le PDF GreenMetric UCAR 2026 est prêt à être téléchargé.",
      });
    } catch (err) {
      setToast({
        title: "Erreur de génération",
        body: err instanceof Error ? err.message : "Erreur de génération",
      });
    } finally {
      setDownloadPhase("idle");
    }
  }

  const markerPosition = Math.min(100, Math.max(0, summary?.percentage ?? 62.6));

  return (
    <div className="mx-auto max-w-[1320px] px-10 pb-16 pt-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-[#2D4A35]">
            Mission Verte · UCAR
          </div>
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight text-zinc-950">
            Classement UI GreenMetric
          </h1>
          <div className="mt-1.5 font-display italic text-[14px] text-zinc-700">
            Évaluation mondiale de durabilité — pilotée par Astaria
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAstariaOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#4A7C59]/40 bg-white px-4 text-[13px] font-semibold text-[#2D4A35] hover:bg-[#A8C4AE]/15 hover:border-[#4A7C59] hover:olive-glow transition"
          >
            <AstariaMark size={16} />
            Parler à Astaria
          </button>
          <StrategyButton phase={downloadPhase} onClick={generatePlan} />
        </div>
      </div>

      {error ? (
        <button
          onClick={loadSummary}
          className="mb-6 inline-flex h-10 items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 text-[13px] text-red-600"
        >
          <RefreshCw size={14} />
          {error} · Réessayer
        </button>
      ) : null}

      {loading || !summary ? (
        <div className="space-y-6">
          <LoadingBlock className="h-[320px]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingBlock key={index} className="h-[230px]" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <TanitCard className="overflow-hidden p-0">
              <div className="grid gap-8 p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
                <div>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <div className="font-mono text-6xl font-semibold leading-none tracking-tight text-zinc-950">
                      #{summary.worldRank}
                    </div>
                    <div className="pb-1 text-[26px] font-semibold text-emerald-600">
                      #{summary.nationalRank} 🇹🇳 Tunisie
                    </div>
                  </div>
                  <div className="mt-5 text-[16px] text-zinc-700">
                    Score:{" "}
                    <span className="font-mono text-zinc-950">
                      {formatNumber(summary.totalScore)} /{" "}
                      {formatNumber(summary.maxScore)}
                    </span>{" "}
                    <span className="text-zinc-500">
                      ({formatNumber(summary.percentage, 1)}%)
                    </span>
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white/60 p-5">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>Position score</span>
                    <span>{formatNumber(summary.percentage, 1)}%</span>
                  </div>
                  <div className="relative h-4 rounded-full bg-zinc-100">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-[#2D4A35] to-[#6BAA7E]"
                      style={{ width: `${markerPosition}%` }}
                    />
                    {[50, 72, 85].map((position) => (
                      <span
                        key={position}
                        className="absolute top-[-4px] h-6 w-px bg-zinc-500"
                        style={{ left: `${position}%` }}
                      />
                    ))}
                    <span
                      className="absolute top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-[#A8C4AE] shadow-[0_0_20px_rgba(107,170,126,0.65)]"
                      style={{ left: `calc(${markerPosition}% - 3px)` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
                    <span>Top 1000 (5 000)</span>
                    <span className="text-center">Top 500 (7 200)</span>
                    <span className="text-right">Top 100 (8 500)</span>
                  </div>
                  <div className="mt-5 text-[11px] text-zinc-500">
                    Source: {summary.source} · Édition {summary.year}
                  </div>
                </div>
              </div>
            </TanitCard>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-[20px] font-semibold text-zinc-950">
                Les 6 catégories
              </h2>
              <div className="mt-1 text-[13px] text-zinc-500">
                Les faiblesses prioritaires sont l&apos;eau et les déchets.
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summary.categories.map((category) => (
                <div
                  key={category.code}
                  ref={(node) => {
                    categoryRefs.current[category.code] = node;
                  }}
                  onClick={() => setOpenCategory(category)}
                  className={`cursor-pointer transition-all rounded-lg ${
                    highlightedCode === category.code
                      ? "ring-2 ring-[#4A7C59]/70 ring-offset-2 ring-offset-white"
                      : ""
                  }`}
                >
                  <GreenMetricCategoryCard category={category} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-[20px] font-semibold text-zinc-950">
                Position parmi les universités tunisiennes
              </h2>
              <div className="mt-1 text-[13px] text-zinc-500">
                UCAR conserve une avance nationale mais reste à distance du seuil top 500.
              </div>
            </div>
            <GreenMetricComparisonTable />
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-zinc-950">
                  Plan stratégique pour atteindre le top 500
                </h2>
                <div className="mt-1 text-[13px] text-zinc-500">
                  Écart à combler: +940 points sur 12 mois
                </div>
              </div>
              <div className="rounded-md border border-[#4A7C59]/30 bg-[#A8C4AE]/20 px-3 py-2 font-mono text-[12px] text-[#2D4A35]">
                Cible score: 7 200
              </div>
            </div>
            <div className="space-y-4">
              {phases.map((phase) => (
                <GreenMetricPhaseCard key={phase.phase} phase={phase} />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <StrategyButton
                phase={downloadPhase}
                onClick={generatePlan}
                className="h-12 px-5 text-[14px]"
              />
            </div>
          </section>

          <section>
            <div className="rounded-md border border-zinc-200 bg-white/70 p-5 text-[12.5px] leading-6 text-zinc-500">
              <span className="font-medium text-zinc-700">
                Note méthodologique.
              </span>{" "}
              Les actions et impacts sont basés sur la méthodologie UI
              GreenMetric 2025 et les pratiques des universités du top 100. Les
              coûts sont des estimations. Le lien avec le financement RESPIRE
              (Banque mondiale) est indirect: les infrastructures du plan
              correspondent aux critères d&apos;investissement de RESPIRE Composante
              1.
            </div>
          </section>
        </div>
      )}
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
      <CategoryDetailSheet
        category={openCategory}
        onClose={() => setOpenCategory(null)}
      />
      <AstariaChatSheet
        open={astariaOpen}
        onClose={() => setAstariaOpen(false)}
      />
    </div>
  );
}
