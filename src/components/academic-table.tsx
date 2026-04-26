"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";

import { fmtNum } from "@/components/tanit-constants";
import type { InstitutionListItem, KpiRecord } from "@/types/api";

type AcademicRow = {
  id: string;
  acronym: string;
  name: string;
  students: number | null;
  graduates: number | null;
  successRate: number | null;
  missing?: boolean;
};

type SortKey = "acronym" | "students" | "graduates" | "successRate";

function normalizeMetric(metric: string) {
  return metric
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildRows(records: KpiRecord[], institutions: InstitutionListItem[]) {
  const rows = new Map<string, AcademicRow>();

  records.forEach((record) => {
    const id = record.institutionId || record.institutionAcronym;
    const row =
      rows.get(id) ??
      ({
        id,
        acronym: record.institutionAcronym,
        name: record.institutionName,
        students: null,
        graduates: null,
        successRate: null,
      } satisfies AcademicRow);
    const metric = normalizeMetric(record.metric);

    if (metric.includes("effectif") && metric.includes("etudiant")) {
      row.students = record.value;
    } else if (metric.includes("diplom")) {
      row.graduates = record.value;
    } else if (metric.includes("taux_reussite") || metric.includes("reussite")) {
      row.successRate = record.value;
    }

    rows.set(id, row);
  });

  institutions
    .filter((institution) => institution.submissionStatus === "missing")
    .forEach((institution) => {
      if (!rows.has(institution.id)) {
        rows.set(institution.id, {
          id: institution.id,
          acronym: institution.acronym,
          name: `${institution.name_fr} (manquant)`,
          students: null,
          graduates: null,
          successRate: null,
          missing: true,
        });
      }
    });

  return Array.from(rows.values());
}

export function AcademicTable({
  records,
  institutions,
}: {
  records: KpiRecord[];
  institutions: InstitutionListItem[];
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "students",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const rows = buildRows(records, institutions);
    const withData = rows.filter((row) => !row.missing);
    const missing = rows.filter((row) => row.missing);

    withData.sort((x, y) => {
      const xv = x[sort.key];
      const yv = y[sort.key];

      if (xv == null) return 1;
      if (yv == null) return -1;
      if (typeof xv === "string" && typeof yv === "string") {
        return sort.dir === "asc" ? xv.localeCompare(yv) : yv.localeCompare(xv);
      }

      return sort.dir === "asc"
        ? Number(xv) - Number(yv)
        : Number(yv) - Number(xv);
    });

    return [...withData, ...missing];
  }, [records, institutions, sort]);

  function renderHeader(k: SortKey, label: string, right?: boolean) {
    const active = sort.key === k;

    return (
      <button
        onClick={() =>
          setSort((current) => ({
            key: k,
            dir:
              current.key === k && current.dir === "desc" ? "asc" : "desc",
          }))
        }
        className={`h-9 px-3 text-[11px] uppercase tracking-wider font-medium inline-flex items-center gap-1 ${
          active ? "text-zinc-800" : "text-zinc-500 hover:text-zinc-700"
        } ${right ? "justify-end" : ""}`}
      >
        {label}
        {active ? (
          sort.dir === "desc" ? (
            <ArrowDown size={11} />
          ) : (
            <ArrowUp size={11} />
          )
        ) : null}
      </button>
    );
  }

  function rateColor(value: number | null) {
    if (value == null) return "text-zinc-400";
    if (value < 30) return "text-red-600";
    if (value < 60) return "text-amber-600";
    return "text-emerald-600";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        <div className="grid grid-cols-[1.6fr_140px_140px_180px] items-center px-3 border-b border-zinc-100">
          {renderHeader("acronym", "Établissement")}
          <div className="flex justify-end">
            {renderHeader("students", "Effectif", true)}
          </div>
          <div className="flex justify-end">
            {renderHeader("graduates", "Diplômés", true)}
          </div>
          <div className="flex justify-end">
            {renderHeader("successRate", "Taux de réussite", true)}
          </div>
        </div>
        <div>
          {sorted.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-[1.6fr_140px_140px_180px] items-center px-3 h-12 border-b border-zinc-100/60 hover:bg-zinc-100/70 transition ${
                row.missing ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[12.5px] text-zinc-900 w-[72px] shrink-0">
                  {row.acronym}
                </span>
                <span className="text-[13px] text-zinc-600 truncate">
                  {row.name}
                </span>
                {row.missing ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/30 ml-2">
                    manquant
                  </span>
                ) : null}
              </div>
              <div className="text-right font-mono text-[13px] text-zinc-800">
                {row.students == null ? "—" : fmtNum(row.students)}
              </div>
              <div className="text-right font-mono text-[13px] text-zinc-800">
                {row.graduates == null ? "—" : fmtNum(row.graduates)}
              </div>
              <div className="flex items-center justify-end gap-3">
                <div className="w-24 h-1 bg-zinc-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      row.successRate == null
                        ? ""
                        : row.successRate < 30
                          ? "bg-red-500"
                          : row.successRate < 60
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                    }`}
                    style={{ width: `${row.successRate || 0}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-[13px] font-medium w-12 text-right ${rateColor(
                    row.successRate,
                  )}`}
                >
                  {row.successRate == null ? "—" : `${row.successRate}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
