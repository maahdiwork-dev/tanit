"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";

import { metricLabel } from "@/components/tanit-constants";
import type { KpiRecord } from "@/types/api";

type SortKey = "metric" | "institution" | "value" | "source";

function humanizeMetric(metric: string) {
  const known = metricLabel(metric);
  if (known !== metric) return known;

  return metric
    .replace(/_/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function formatValue(metric: string, value: number) {
  const normalized = metric.toLowerCase();
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);

  if (
    normalized.includes("pct") ||
    normalized.includes("percent") ||
    normalized.includes("taux") ||
    normalized.includes("part_")
  ) {
    return `${formatted} %`;
  }

  if (normalized.includes("_mdt")) return `${formatted} MDT`;
  if (normalized.includes("_tnd")) return `${formatted} TND`;
  if (normalized.includes("_eur")) return `${formatted} EUR`;
  if (normalized.includes("_usd")) return `${formatted} USD`;
  if (normalized.includes("rank") || normalized.includes("rang")) {
    return `#${formatted}`;
  }

  return formatted;
}

export function KpiTable({ records }: { records: KpiRecord[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "metric",
    dir: "asc",
  });

  const rows = useMemo(() => {
    return [...records].sort((a, b) => {
      const ax =
        sort.key === "institution"
          ? (a.institutionAcronym || a.institutionName || "")
          : sort.key === "source"
            ? (a.source || "")
            : sort.key === "metric"
              ? humanizeMetric(a.metric)
              : a.value;
      const bx =
        sort.key === "institution"
          ? (b.institutionAcronym || b.institutionName || "")
          : sort.key === "source"
            ? (b.source || "")
            : sort.key === "metric"
              ? humanizeMetric(b.metric)
              : b.value;

      const result =
        typeof ax === "number" && typeof bx === "number"
          ? ax - bx
          : String(ax).localeCompare(String(bx), "fr");

      return sort.dir === "asc" ? result : -result;
    });
  }, [records, sort]);

  function renderHeader(key: SortKey, label: string, right?: boolean) {
    const active = sort.key === key;

    return (
      <button
        onClick={() =>
          setSort((current) => ({
            key,
            dir:
              current.key === key && current.dir === "asc" ? "desc" : "asc",
          }))
        }
        className={`h-9 px-3 text-[11px] uppercase tracking-wider font-medium inline-flex items-center gap-1 ${
          active ? "text-zinc-800" : "text-zinc-500 hover:text-zinc-700"
        } ${right ? "justify-end" : ""}`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp size={11} />
          ) : (
            <ArrowDown size={11} />
          )
        ) : null}
      </button>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[1.5fr_170px_150px_1.2fr] items-center px-3 border-b border-zinc-100">
          {renderHeader("metric", "Indicateur")}
          {renderHeader("institution", "Périmètre")}
          <div className="flex justify-end">
            {renderHeader("value", "Valeur", true)}
          </div>
          {renderHeader("source", "Source")}
        </div>
        {rows.map((row) => (
          <div
            key={`${row.institutionId}-${row.metric}-${row.period}-${row.source ?? ""}`}
            className="grid grid-cols-[1.5fr_170px_150px_1.2fr] items-center px-3 min-h-12 border-b border-zinc-100/60 hover:bg-zinc-100/70"
          >
            <div className="px-3 py-3 text-[13px] text-zinc-800 truncate">
              {humanizeMetric(row.metric)}
            </div>
            <div className="px-3 py-3 min-w-0">
              <div className="font-mono text-[12px] text-zinc-900 truncate">
                {row.institutionAcronym || "UCAR"}
              </div>
              {row.institutionName ? (
                <div className="text-[11.5px] text-zinc-500 truncate">
                  {row.institutionName}
                </div>
              ) : null}
            </div>
            <div className="px-3 py-3 text-right font-mono text-[13px] text-zinc-800">
              {formatValue(row.metric, row.value)}
            </div>
            <div className="px-3 py-3 text-[12px] text-zinc-500 truncate">
              {row.source || "Base Tanit"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
