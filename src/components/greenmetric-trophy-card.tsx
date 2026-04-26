"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf } from "lucide-react";

import { TanitCard } from "@/components/tanit-card";

const CATEGORY_CHIPS: Array<{ code: string; tooltip: string }> = [
  { code: "SI", tooltip: "Infrastructure" },
  { code: "EC", tooltip: "Énergie" },
  { code: "WS", tooltip: "Déchets" },
  { code: "WR", tooltip: "Eau" },
  { code: "TR", tooltip: "Transport" },
  { code: "ED", tooltip: "Éducation" },
];

export function GreenMetricTrophyCard() {
  const router = useRouter();

  return (
    <TanitCard className="relative h-full overflow-hidden">
      <div className="absolute right-4 top-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-600">
        <Leaf size={18} />
      </div>
      <div className="mb-4 pr-10 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        GreenMetric
      </div>
      <Link href="/greenmetric" className="block group">
        <div className="text-[36px] font-semibold leading-none tracking-tight text-zinc-950">
          #1 <span className="text-[26px]">🇹🇳</span>
        </div>
        <div className="mt-3 text-[12px] text-zinc-600">
          <span className="font-mono text-zinc-800">#688</span> mondial
          <span className="mx-1.5 text-zinc-300">·</span>
          Score <span className="font-mono text-zinc-800">6 260</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-600 group-hover:text-blue-700">
          Voir le tableau <ArrowRight size={12} />
        </div>
      </Link>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.code}
            onClick={() => router.push(`/greenmetric?category=${chip.code}`)}
            title={chip.tooltip}
            className="font-mono text-[10.5px] tracking-wide px-1.5 h-6 rounded border border-zinc-200 bg-white text-zinc-700 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-700 transition"
          >
            {chip.code}
          </button>
        ))}
      </div>
    </TanitCard>
  );
}
