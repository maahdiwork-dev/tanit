"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { TanitCard } from "@/components/tanit-card";

export type DomainCardVariant = "tanit" | "astaria";

export function DomainCard({
  icon: Icon,
  iconNode,
  eyebrow,
  metric,
  metricSub,
  cta = "Explorer",
  href,
  variant = "tanit",
}: {
  icon?: LucideIcon;
  iconNode?: React.ReactNode;
  eyebrow: string;
  metric: string;
  metricSub: string;
  cta?: string;
  href: string;
  variant?: DomainCardVariant;
}) {
  const isAstaria = variant === "astaria";

  return (
    <Link href={href} className="block group h-full">
      <TanitCard className="relative h-full overflow-hidden transition-all group-hover:border-zinc-300 group-hover:shadow-md">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-9 h-9 rounded-md grid place-items-center ${
              isAstaria
                ? "bg-[#4A7C59]/10 border border-[#4A7C59]/30"
                : "bg-blue-500/10 border border-blue-500/30"
            }`}
          >
            {iconNode ? (
              iconNode
            ) : Icon ? (
              <Icon
                size={16}
                className={isAstaria ? "text-[#2D4A35]" : "text-blue-700"}
              />
            ) : null}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] font-medium text-zinc-500">
            {eyebrow}
          </div>
        </div>

        <div className="font-mono text-[28px] font-semibold leading-none tracking-tight text-zinc-950">
          {metric}
        </div>
        <div className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
          {metricSub}
        </div>

        <div
          className={`mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            isAstaria
              ? "text-[#2D4A35] group-hover:text-[#4A7C59]"
              : "text-blue-600 group-hover:text-blue-700"
          }`}
        >
          {cta} <ArrowRight size={12} />
        </div>
      </TanitCard>
    </Link>
  );
}
