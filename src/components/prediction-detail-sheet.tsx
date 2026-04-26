"use client";

import { ArrowDown, ArrowRight, TrendingDown, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { SideSheet } from "@/components/side-sheet";
import { Sparkline } from "@/components/sparkline";
import { fmtNum, metricLabel } from "@/components/tanit-constants";
import type { Prediction } from "@/types/api";

export function PredictionDetailSheet({
  prediction,
  onClose,
}: {
  prediction: Prediction | null;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!prediction) return null;

  const label = metricLabel(prediction.metric);
  const trendDelta =
    prediction.trendData[prediction.trendData.length - 1] -
    prediction.trendData[0];
  const trendDirection =
    trendDelta < 0 ? "baissière" : trendDelta > 0 ? "haussière" : "stable";
  const confidencePct = Math.round(prediction.confidence * 100);

  function askTanit() {
    if (!prediction) return;
    const question = `Pourquoi la tendance ${trendDirection} sur ${label.toLowerCase()} pour ${
      prediction.institutionAcronym
    } et que recommandes-tu?`;
    onClose();
    router.push(`/chat?prefill=${encodeURIComponent(question)}`);
  }

  return (
    <SideSheet open={true} onClose={onClose}>
      <div className="px-7 py-6 border-b border-zinc-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <TrendingDown size={12} className="text-blue-600" />
            <span>Prédiction Tanit</span>
            <span className="text-zinc-300">/</span>
            <span>{prediction.predictedPeriod}</span>
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
            {prediction.institutionAcronym}
          </div>
        </div>
        <div className="text-[14px] text-zinc-700">
          {prediction.institutionName}
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-3">
          Indicateur
        </div>
        <div className="text-[15px] font-medium text-zinc-900">{label}</div>
        <div className="mt-4 flex items-baseline gap-3">
          <div className="font-mono text-[34px] font-semibold leading-none text-zinc-950">
            {fmtNum(prediction.currentValue)}
          </div>
          <div className="text-[12px] text-zinc-500">
            actuel ·{" "}
            <span className="font-mono text-zinc-700">
              {prediction.trendYears[prediction.trendYears.length - 1]}
            </span>
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-blue-700 font-mono">
          <ArrowDown size={12} />
          {fmtNum(prediction.predictedValue)} prévu en{" "}
          {prediction.predictedPeriod}
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-4">
          Tendance · 3 ans
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <Sparkline
            data={prediction.trendData}
            predicted={prediction.predictedValue}
            width={320}
            height={120}
          />
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-zinc-600">
            {prediction.trendData.map((value, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-zinc-800">{fmtNum(value)}</span>
                <span className="text-zinc-500">{prediction.trendYears[i]}</span>
              </div>
            ))}
            <div className="flex flex-col items-center">
              <span className="text-blue-700">
                {fmtNum(prediction.predictedValue)}
              </span>
              <span className="text-blue-700/70">
                {prediction.predictedPeriod}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-3">
          Confiance du modèle
        </div>
        <div className="flex items-center justify-between text-[12px] mb-1.5">
          <span className="text-zinc-600">Score</span>
          <span className="font-mono text-zinc-800">{confidencePct}%</span>
        </div>
        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <div className="text-[12px] text-zinc-700 italic mt-3 leading-relaxed">
          {prediction.message}
        </div>
      </div>

      <div className="px-7 py-6 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-2">
          Méthodologie
        </div>
        <div className="text-[12px] text-zinc-600 leading-relaxed">
          Tendance linéaire calculée sur les 3 dernières années (2021–2023).
          Source : <span className="text-zinc-800">data.gov.tn</span>.
        </div>
      </div>

      <div className="px-7 py-5 sticky bottom-0 bg-white/95 backdrop-blur border-t border-zinc-200">
        <button
          onClick={askTanit}
          className="w-full h-11 rounded-md text-white font-medium text-[13.5px] inline-flex items-center justify-center gap-2 brand-glow"
          style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
        >
          Demander à Tanit pourquoi cette tendance
          <ArrowRight size={14} />
        </button>
      </div>
    </SideSheet>
  );
}
