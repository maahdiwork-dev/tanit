import type { InstitutionListItem, KpiRecord } from "@/types/api";

type HrRow = {
  id: string;
  acronym: string;
  name: string;
  teachers: number | null;
  ratio: string;
  tenured: number | null;
};

function normalizeMetric(metric: string) {
  return metric
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildRows(records: KpiRecord[]) {
  const rows = new Map<
    string,
    HrRow & { students?: number | null; teachersRaw?: number | null }
  >();

  records.forEach((record) => {
    const id = record.institutionId || record.institutionAcronym;
    const row =
      rows.get(id) ??
      ({
        id,
        acronym: record.institutionAcronym,
        name: record.institutionName,
        teachers: null,
        ratio: "—",
        tenured: null,
      } satisfies HrRow);
    const metric = normalizeMetric(record.metric);

    if (metric.includes("enseignant")) {
      row.teachers = record.value;
      row.teachersRaw = record.value;
    } else if (metric.includes("effectif") && metric.includes("etudiant")) {
      row.students = record.value;
    } else if (metric.includes("ratio")) {
      row.ratio = String(record.value);
    } else if (metric.includes("titulaire")) {
      row.tenured = record.value;
    }

    if (
      row.ratio === "—" &&
      row.students != null &&
      row.teachersRaw != null &&
      row.teachersRaw > 0
    ) {
      row.ratio = (row.students / row.teachersRaw).toFixed(1);
    }

    rows.set(id, row);
  });

  return Array.from(rows.values());
}

export function HRTable({
  records,
}: {
  records: KpiRecord[];
  institutions: InstitutionListItem[];
}) {
  const rows = buildRows(records);

  return (
    <div>
      <div className="grid grid-cols-[1.6fr_140px_180px_140px] items-center px-3 border-b border-zinc-100">
        {[
          "Établissement",
          "Enseignants",
          "Ratio étudiants/enseignant",
          "Titulaires (%)",
        ].map((heading, i) => (
          <div
            key={heading}
            className={`h-9 px-3 text-[11px] uppercase tracking-wider font-medium text-zinc-500 ${
              i > 0 ? "text-right" : ""
            }`}
          >
            {heading}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[1.6fr_140px_180px_140px] items-center px-3 h-12 border-b border-zinc-100/60 hover:bg-zinc-100/70"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[12.5px] text-zinc-900 w-[72px] shrink-0">
              {row.acronym}
            </span>
            <span className="text-[13px] text-zinc-600 truncate">
              {row.name}
            </span>
          </div>
          <div className="text-right font-mono text-[13px] text-zinc-800 px-3">
            {row.teachers ?? "—"}
          </div>
          <div className="text-right font-mono text-[13px] text-zinc-800 px-3">
            {row.ratio}
          </div>
          <div className="text-right font-mono text-[13px] text-zinc-800 px-3">
            {row.tenured == null ? "—" : `${row.tenured}%`}
          </div>
        </div>
      ))}
    </div>
  );
}
