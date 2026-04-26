import { CheckCircle2 } from "lucide-react";

import { TanitCard } from "@/components/tanit-card";

export type GreenMetricPhaseAction = {
  label: string;
  impact: string;
  cost: string;
};

export type GreenMetricPhase = {
  phase: string;
  title: string;
  period: string;
  points: number;
  actions: GreenMetricPhaseAction[];
};

export function GreenMetricPhaseCard({ phase }: { phase: GreenMetricPhase }) {
  return (
    <TanitCard>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-blue-600">
            {phase.phase} · {phase.period}
          </div>
          <div className="mt-1 text-[17px] font-semibold text-zinc-950">
            {phase.title}
          </div>
        </div>
        <div className="w-fit rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[13px] font-semibold text-emerald-700">
          +{phase.points} pts
        </div>
      </div>

      <div className="space-y-2">
        {phase.actions.map((action) => (
          <div
            key={action.label}
            className="grid gap-3 rounded-md border border-zinc-100 bg-white/50 px-3 py-3 md:grid-cols-[1fr_130px_110px]"
          >
            <div className="flex min-w-0 items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="text-[13px] leading-5 text-zinc-800">
                {action.label}
              </span>
            </div>
            <div className="font-mono text-[12px] text-blue-700">
              {action.impact}
            </div>
            <div className="font-mono text-[12px] text-zinc-600">
              {action.cost}
            </div>
          </div>
        ))}
      </div>
    </TanitCard>
  );
}
