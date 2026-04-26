"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { SideSheet } from "@/components/side-sheet";
import type { GreenMetricCategory, GreenMetricCategoryCode } from "@/types/api";

type CategoryStaticInfo = {
  indicators: Array<{ code: string; label: string; weight: string }>;
  actions: string[];
};

const CATEGORY_INFO: Record<GreenMetricCategoryCode, CategoryStaticInfo> = {
  SI: {
    indicators: [
      { code: "SI.1", label: "Surface campus végétalisée", weight: "300 pts" },
      { code: "SI.2", label: "Surface plantée totale", weight: "200 pts" },
      { code: "SI.3", label: "Espaces forestiers ouverts", weight: "300 pts" },
      { code: "SI.4", label: "Surfaces d'absorption d'eau", weight: "300 pts" },
      { code: "SI.5", label: "Budget durabilité du campus", weight: "200 pts" },
    ],
    actions: [
      "Cartographie standardisée des 33 campus",
      "Trous d'infiltration (volontaires étudiants)",
    ],
  },
  EC: {
    indicators: [
      { code: "EC.4", label: "Compteurs intelligents énergie", weight: "300 pts" },
      { code: "EC.11", label: "Programmes énergie climat", weight: "300 pts" },
      { code: "EC.6", label: "Sources d'énergie renouvelable", weight: "200 pts" },
      { code: "EC.10", label: "Efficacité énergétique", weight: "200 pts" },
    ],
    actions: ["Compteurs intelligents énergie (10 établissements)"],
  },
  WS: {
    indicators: [
      { code: "WS.1", label: "Programme tri des déchets", weight: "300 pts" },
      {
        code: "WS.2",
        label: "Politique anti-plastique à usage unique",
        weight: "300 pts",
      },
      { code: "WS.3", label: "Programme compostage", weight: "300 pts" },
      { code: "WS.4", label: "Recyclage des déchets", weight: "300 pts" },
      { code: "WS.5", label: "Gestion des e-déchets", weight: "200 pts" },
    ],
    actions: [
      "Interdiction du plastique à usage unique (décret UCAR)",
      "Bacs de tri colorés dans les 33 établissements",
      "Compostage cafétérias (10 plus grands établissements)",
      "Collecte certifiée des e-déchets (UCAR)",
      "Audit complet des déchets",
    ],
  },
  WR: {
    indicators: [
      {
        code: "WR.1",
        label: "Programme conservation de l'eau",
        weight: "300 pts",
      },
      { code: "WR.2", label: "Récupération d'eau de pluie", weight: "200 pts" },
      { code: "WR.3", label: "Robinetterie économe", weight: "200 pts" },
      { code: "WR.5", label: "Tests qualité de l'eau", weight: "200 pts" },
    ],
    actions: [
      "Programme de tests de qualité de l'eau (FSB)",
      "Robinetterie économe (15 établissements pilotes)",
      "Récupération d'eau de pluie (10 établissements)",
    ],
  },
  TR: {
    indicators: [
      { code: "TR.1", label: "Véhicules sur le campus", weight: "200 pts" },
      { code: "TR.6", label: "Politique transport décarboné", weight: "300 pts" },
      { code: "TR.7", label: "Initiatives transport propre", weight: "200 pts" },
    ],
    actions: [],
  },
  ED: {
    indicators: [
      { code: "ED.1", label: "Cours sur le développement durable", weight: "300 pts" },
      { code: "ED.6", label: "Publications recherche durable", weight: "300 pts" },
      {
        code: "ED.13",
        label: "Cellule coordination développement durable",
        weight: "200 pts",
      },
    ],
    actions: [
      "Formalisation cellule coordination développement durable",
      "Formation 33 référents GreenMetric",
    ],
  },
};

const STATUS_LABEL: Record<string, string> = {
  strong: "Solide",
  medium: "À renforcer",
  weak: "Sous-performant",
};

export function CategoryDetailSheet({
  category,
  onClose,
}: {
  category: GreenMetricCategory | null;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!category) return null;

  const info = CATEGORY_INFO[category.code];
  const statusLabel = STATUS_LABEL[category.status] ?? category.status;

  function askTanit() {
    if (!category) return;
    const question = `Que recommandes-tu pour la catégorie GreenMetric ${category.code} (${category.label})? Notre score est ${category.score}/${category.max} (${category.percentage}%).`;
    onClose();
    router.push(`/chat?prefill=${encodeURIComponent(question)}`);
  }

  return (
    <SideSheet open={true} onClose={onClose}>
      <div className="px-7 py-6 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>GreenMetric</span>
            <span className="text-zinc-300">/</span>
            <span>{category.code}</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-1 -m-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className="font-mono text-[26px] font-semibold text-zinc-950 tracking-tight">
            {category.code}
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700">
            {statusLabel}
          </span>
        </div>
        <div className="text-[14px] text-zinc-700">{category.label}</div>
        <div className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
          {category.description}
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-3">
          Score UCAR
        </div>
        <div className="flex items-baseline gap-3">
          <div className="font-mono text-[32px] font-semibold leading-none text-zinc-950">
            {Math.round(category.score)}
          </div>
          <div className="text-[12px] text-zinc-500">
            / {Math.round(category.max)} ·{" "}
            <span className="font-mono text-zinc-700">
              {Math.round(category.percentage)}%
            </span>
          </div>
        </div>
        <div className="h-1.5 mt-4 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${category.percentage}%` }}
          />
        </div>
      </div>

      {info ? (
        <div className="px-7 py-6 border-b border-zinc-100">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-4">
            Indicateurs principaux
          </div>
          <div className="space-y-2">
            {info.indicators.map((indicator) => (
              <div
                key={indicator.code}
                className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-md border border-zinc-200 bg-white"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[12px] text-blue-700">
                    {indicator.code}
                  </div>
                  <div className="text-[12.5px] text-zinc-800 mt-0.5 leading-tight">
                    {indicator.label}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-zinc-500 shrink-0">
                  {indicator.weight}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {info?.actions && info.actions.length > 0 ? (
        <div className="px-7 py-6 border-b border-zinc-100">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-3">
            Actions du plan stratégique
          </div>
          <div className="space-y-2">
            {info.actions.map((action) => (
              <div
                key={action}
                className="flex items-start gap-2.5 text-[12.5px] text-zinc-800 leading-relaxed"
              >
                <Check
                  size={13}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-2">
          Source
        </div>
        <div className="text-[12px] text-zinc-600 leading-relaxed">
          Méthodologie UI GreenMetric 2025 ·{" "}
          <span className="text-zinc-800">uigreenmetric.com</span>
        </div>
      </div>

      <div className="px-7 py-5 sticky bottom-0 bg-white/95 backdrop-blur border-t border-zinc-200">
        <button
          onClick={askTanit}
          className="w-full h-11 rounded-md text-white font-medium text-[13.5px] inline-flex items-center justify-center gap-2 brand-glow"
          style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
        >
          Demander à Tanit sur cette catégorie
          <ArrowRight size={14} />
        </button>
      </div>
    </SideSheet>
  );
}
