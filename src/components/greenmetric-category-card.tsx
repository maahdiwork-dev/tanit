import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";

import { TanitCard } from "@/components/tanit-card";
import { cn } from "@/lib/utils";
import type { GreenMetricCategory } from "@/types/api";

const statusMeta = {
  strong: {
    label: "Solide",
    icon: CheckCircle2,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    bar: "bg-emerald-500",
  },
  medium: {
    label: "À renforcer",
    icon: CircleDot,
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    bar: "bg-amber-500",
  },
  weak: {
    label: "Sous-performant",
    icon: AlertTriangle,
    badge: "border-red-500/30 bg-red-500/10 text-red-600",
    bar: "bg-red-500",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function GreenMetricCategoryCard({
  category,
}: {
  category: GreenMetricCategory;
}) {
  const meta = statusMeta[category.status];
  const Icon = meta.icon;
  const isPriority = category.code === "WR" || category.code === "WS";

  return (
    <TanitCard className={cn(isPriority && "border-red-500/30 bg-red-500/[0.035]")}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-zinc-500">
            {category.code}
          </div>
          <div className="mt-1 text-[15px] font-medium text-zinc-950">
            {category.label}
          </div>
          <div className="mt-1 text-[12px] leading-5 text-zinc-500">
            {category.description}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
            meta.badge,
          )}
        >
          <Icon size={12} />
          {meta.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="font-mono text-[28px] font-semibold leading-none text-zinc-950">
          {formatNumber(category.score)}
        </div>
        <div className="pb-1 font-mono text-[12px] text-zinc-500">
          / {formatNumber(category.max)}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">Score relatif</span>
          <span className="text-zinc-700">{formatNumber(category.percentage)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-50">
          <div
            className={cn("h-full rounded-full", meta.bar)}
            style={{ width: `${category.percentage}%` }}
          />
        </div>
      </div>

      {isPriority ? (
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] font-medium text-red-700">
          Priorité du plan stratégique
        </div>
      ) : null}
    </TanitCard>
  );
}
