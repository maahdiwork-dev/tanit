import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";

import {
  ApiError,
  handleApiError,
  readJsonBody,
  requiredString,
  unwrapRelation,
} from "@/lib/server-api";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { AlertRow, InstitutionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type ReportRequest = {
  institutionId?: string | null;
  period?: string;
  type?: string;
  cycleId?: string;
  cycle?: CycleReportPayload;
};

type CyclePerInstitutionResultPayload = {
  institutionAcronym: string;
  institutionName: string;
  governorate: string;
  actionLabel: string;
  actionTaken: boolean;
  notes: string;
};

type CycleReportPayload = {
  cycleId: string;
  startedAt: string;
  finishedAt: string;
  checked: number;
  missingFound: number;
  actionsCreated: number;
  newAlertsCount: number;
  conformInstitutionsCount: number;
  perInstitutionResults: CyclePerInstitutionResultPayload[];
  summary: string;
};

type KpiWithInstitution = {
  institution_id: string;
  domain: string;
  metric: string;
  value: number;
  period: string;
  institutions?:
    | Pick<InstitutionRow, "name_fr" | "acronym">
    | Array<Pick<InstitutionRow, "name_fr" | "acronym">>
    | null;
};

type GreenMetricPdfCategory = {
  code: string;
  metric: string;
  label: string;
  score: number;
  max: number;
  percentage: number;
  status: string;
};

type GreenMetricPdfAction = {
  id: string;
  action: string;
  category: string;
  impact: number;
  cost: string;
  delay: string;
};

type GreenMetricPdfPhase = {
  title: string;
  period: string;
  targetPoints: number;
  targetCost: string;
  totalNote: string;
  actions: GreenMetricPdfAction[];
};

type ReportSupabase = ReturnType<typeof getSupabaseAdmin> | null;

type GreenMetricSummaryKpiRow = {
  metric: string;
  value: number | string | null;
  period?: string | null;
};

const jadePrimary: [number, number, number] = [74, 124, 89];
const jadeDeep: [number, number, number] = [45, 74, 53];
const jadeSoft: [number, number, number] = [168, 196, 174];
const jadeGlow: [number, number, number] = [107, 170, 126];
const ink: [number, number, number] = [28, 35, 31];
const muted: [number, number, number] = [92, 105, 96];

const greenMetricCategoryDefinitions: Array<
  Pick<GreenMetricPdfCategory, "code" | "metric" | "label" | "max">
> = [
  {
    code: "SI",
    metric: "greenmetric_si_score",
    label: "Setting & Infrastructure",
    max: 1500,
  },
  {
    code: "EC",
    metric: "greenmetric_ec_score",
    label: "Energy & Climate",
    max: 2100,
  },
  {
    code: "WS",
    metric: "greenmetric_ws_score",
    label: "Waste",
    max: 1800,
  },
  {
    code: "WR",
    metric: "greenmetric_wr_score",
    label: "Water",
    max: 1000,
  },
  {
    code: "TR",
    metric: "greenmetric_tr_score",
    label: "Transportation",
    max: 1800,
  },
  {
    code: "ED",
    metric: "greenmetric_ed_score",
    label: "Education & Research",
    max: 1800,
  },
];

const greenMetricPdfFallbackScores: Record<string, number> = {
  greenmetric_si_score: 1225,
  greenmetric_ec_score: 1375,
  greenmetric_ws_score: 650,
  greenmetric_wr_score: 437.5,
  greenmetric_tr_score: 1022.5,
  greenmetric_ed_score: 1550,
};

const greenMetricPdfPhases: GreenMetricPdfPhase[] = [
  {
    title: "Phase 1 — Politiques et Gains Rapides",
    period: "Mois 1-3",
    targetPoints: 300,
    targetCost: "145K TND",
    totalNote:
      "Phase 1 totals: +630 pts available; we target +300 (selection of strongest), 145K TND",
    actions: [
      {
        id: "P1.1",
        action:
          "Interdiction du plastique à usage unique sur l'ensemble des 33 établissements (décret UCAR Présidence)",
        category: "WS.2",
        impact: 200,
        cost: "0 TND",
        delay: "1 semaine",
      },
      {
        id: "P1.2",
        action:
          "Bacs de tri colorés (papier / plastique / verre / organique / toxique) dans les 33 établissements avec signalétique standardisée",
        category: "WS.1 + WS.4",
        impact: 150,
        cost: "100K TND",
        delay: "1 mois",
      },
      {
        id: "P1.3",
        action:
          "Programme trimestriel de tests de qualité de l'eau, exécuté par les laboratoires de chimie de la FSB",
        category: "WR.5",
        impact: 150,
        cost: "15K TND/an",
        delay: "Immédiat",
      },
      {
        id: "P1.4",
        action:
          "Formalisation par décret de la cellule de coordination développement durable à la Présidence UCAR",
        category: "ED.13",
        impact: 30,
        cost: "0 TND",
        delay: "1 mois",
      },
      {
        id: "P1.5",
        action:
          "Cartographie standardisée des 33 campus (surface, bâtiments, espaces verts, plans d'eau)",
        category: "SI.1, SI.2, SI.3, SI.5",
        impact: 100,
        cost: "30K TND",
        delay: "2 mois",
      },
    ],
  },
  {
    title: "Phase 2 — Infrastructure",
    period: "Mois 4-8",
    targetPoints: 400,
    targetCost: "240K TND",
    totalNote: "Phase 2 totals: +650 pts available; we target +400, 240K TND",
    actions: [
      {
        id: "P2.1",
        action:
          "Robinetterie économe (mitigeurs, chasses double-flux, urinoirs sans eau) sur 15 établissements pilotes",
        category: "WR.3",
        impact: 100,
        cost: "75K TND",
        delay: "4 mois",
      },
      {
        id: "P2.2",
        action:
          "Système de récupération d'eau de pluie (toitures + citernes) sur 10 établissements",
        category: "WR.2",
        impact: 100,
        cost: "100K TND",
        delay: "6 mois",
      },
      {
        id: "P2.3",
        action:
          "Compostage des déchets de cafétéria sur les 10 plus grands établissements",
        category: "WS.3",
        impact: 200,
        cost: "50K TND",
        delay: "5 mois",
      },
      {
        id: "P2.4",
        action:
          "Trous d'infiltration biopore (volontaires étudiants) sur tous les sites",
        category: "WR.1 + SI.4",
        impact: 50,
        cost: "5K TND",
        delay: "2 mois",
      },
      {
        id: "P2.5",
        action:
          "Contrat de collecte et traitement certifié des e-déchets, géré par UCAR centrale",
        category: "WS.5",
        impact: 200,
        cost: "10K TND/an",
        delay: "3 mois",
      },
    ],
  },
  {
    title: "Phase 3 — Mesure et Reporting",
    period: "Mois 9-12",
    targetPoints: 240,
    targetCost: "125K TND",
    totalNote: "Phase 3 totals: +240 pts, 125K TND",
    actions: [
      {
        id: "P3.1",
        action:
          "Compteurs intelligents d'énergie sur 10 établissements (mesure mensuelle par bâtiment)",
        category: "EC.4 + EC.11",
        impact: 100,
        cost: "100K TND",
        delay: "4 mois",
      },
      {
        id: "P3.2",
        action:
          "Audit complet des déchets sur les 33 établissements (établir baseline tous types)",
        category: "Base WS",
        impact: 100,
        cost: "20K TND",
        delay: "3 mois",
      },
      {
        id: "P3.3",
        action:
          "Formation des 33 référents GreenMetric par établissement (collecte de données + dossiers de preuve)",
        category: "Qualité dossier",
        impact: 40,
        cost: "5K TND",
        delay: "2 mois",
      },
    ],
  },
];

const greenMetricBudgetRows = [
  ["Phase 1", "+300", "145K TND", "+300 / 145K TND"],
  ["Phase 2", "+400", "240K TND", "+700 / 385K TND"],
  ["Phase 3", "+240", "125K TND", "+940 / 510K TND"],
  ["Total", "+940", "~510K TND", "~1.5M TND Année 1"],
];

const greenMetricFundingSources = [
  [
    "RESPIRE Composante 1 (Banque mondiale, $70M alloués infrastructure verte)",
    "bacs, eau, énergie, e-waste : ~30% du budget potentiellement éligible. Lien indirect — RESPIRE finance les infrastructures, qui améliorent GreenMetric. Honnête.",
  ],
  ["Budget MESRS maintenance", "robinetterie, audits, tests"],
  [
    "Volontariat étudiants",
    "biopores, sensibilisation, sortie de programmes 3ZERO",
  ],
  ["Budget UCAR opérationnel", "formation, coordination, suivi"],
];

const greenMetricSequencing = [
  [
    "Why Phase 1 first",
    "Decree-driven actions (single-use plastic ban, cellule formalisation) cost zero and signal commitment. Quick wins build momentum and demonstrate the system works.",
  ],
  [
    "Why infrastructure (Phase 2) before measurement (Phase 3)",
    "You can't measure what you haven't installed. Smart meters before smart metering.",
  ],
  [
    "Why the policy decree at week 1",
    "It's the single highest-impact zero-cost action. WS.2 contributes 300 max; we capture 200 with a decree alone.",
  ],
];

const greenMetricDependencies = [
  [
    "P1.1 → P1.2",
    "P1.1 (plastic ban decree) enables P1.2 (recycling bins) — without ban, bins are decorative",
  ],
  [
    "P2.5 → WS.5",
    "P2.5 (e-waste contract) enables WS.5 score — needs licensed handler",
  ],
  [
    "P3.1 → EC.4",
    "P3.1 (smart meters) enables EC.4 measurement — needed for EC point gain",
  ],
  [
    "P3.3 → evidence quality",
    "P3.3 (referents training) multiplies all evidence quality — last because referents need real programs to document",
  ],
];

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-");
}

function formatNumber(value: number | null) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function finalY(doc: jsPDF, fallback: number) {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

function tableRows(
  kpis: KpiWithInstitution[],
  metrics: string[],
  includeInstitution: boolean,
) {
  return kpis
    .filter((kpi) => metrics.includes(kpi.metric))
    .map((kpi) => {
      const institution = unwrapRelation(kpi.institutions);
      const base = [
        kpi.metric,
        formatNumber(kpi.value),
        kpi.period,
      ];

      return includeInstitution
        ? [institution?.acronym ?? kpi.institution_id, ...base]
        : base;
    });
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addFooter(doc: jsPDF, dateText: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 95, 105);
    doc.text(
      `Généré automatiquement par Tanit · Plateforme intelligente UCAR · ${dateText}`,
      14,
      286,
    );
    doc.text(`${page}/${pageCount}`, 196, 286, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text(title, 14, y);
}

function writeLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  options: { width?: number; lineHeight?: number } = {},
) {
  const width = options.width ?? 176;
  const lineHeight = options.lineHeight ?? 6;
  let cursor = y;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, width) as string[];
    doc.text(wrapped, x, cursor);
    cursor += wrapped.length * lineHeight;
  }

  return cursor;
}

function ensurePageSpace(doc: jsPDF, y: number, needed = 40) {
  if (y + needed <= 270) {
    return y;
  }

  doc.addPage();
  return 22;
}

function generateDemoInstitutionReport(period: string, type: string) {
  const generatedAt = new Date();
  const dateText = formatDateLong(generatedAt);
  const filename = `${safeSegment(type)}-UCAR-demo-${safeSegment(period)}.pdf`;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Rapport ${type} - Université de Carthage`, 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(`Période: ${period}`, 14, 32);
  doc.text(`Généré par Tanit · ${dateText}`, 14, 39);

  autoTable(doc, {
    startY: 52,
    head: [["Indicateur", "Valeur", "Statut"]],
    body: [
      ["Conformité institutionnelle", "91%", "Stable"],
      ["Établissements en attente", "3", "Action requise"],
      ["Alertes critiques", "1", "Surveillance active"],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 124, 233] },
  });

  const y = finalY(doc, 82) + 12;
  writeLines(
    doc,
    [
      "Mode démo: ce rapport est généré sans accès Supabase. Configurez les variables d'environnement Supabase pour produire le rapport institutionnel complet.",
    ],
    14,
    y,
  );

  addFooter(doc, dateText);
  const pdf = doc.output("arraybuffer");

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function strategyStatusFor(percentage: number) {
  if (percentage > 75) return "Solide";
  if (percentage >= 50) return "À renforcer";
  return "Sous-performant";
}

function strategyStatusColor(status: string): [number, number, number] {
  if (status === "Solide") return jadePrimary;
  if (status === "À renforcer") return [158, 120, 42];
  return [156, 64, 54];
}

function fallbackGreenMetricCategories() {
  return greenMetricCategoryDefinitions.map((category) => {
    const score = greenMetricPdfFallbackScores[category.metric] ?? 0;
    const percentage = roundOne((score / category.max) * 100);

    return {
      ...category,
      score,
      percentage,
      status: strategyStatusFor(percentage),
    };
  });
}

async function loadGreenMetricPdfCategories(supabase: ReportSupabase) {
  const fallback = {
    categories: fallbackGreenMetricCategories(),
    sourceNote: "Données figées as of évaluation 2025.",
  };

  if (!supabase) {
    return fallback;
  }

  try {
    const institutionResult = await supabase
      .from("institutions")
      .select("id")
      .eq("code", "400")
      .maybeSingle();

    if (institutionResult.error) {
      throw institutionResult.error;
    }

    if (!institutionResult.data) {
      throw new Error("Institution UCAR Présidence introuvable");
    }

    const requiredMetrics = greenMetricCategoryDefinitions.map(
      (category) => category.metric,
    );
    const { data, error } = await supabase
      .from("kpis")
      .select("metric, value, period")
      .eq("institution_id", institutionResult.data.id)
      .in("metric", requiredMetrics)
      .order("period", { ascending: false });

    if (error) {
      throw error;
    }

    const metricValues = new Map<string, number>();
    for (const row of (data ?? []) as GreenMetricSummaryKpiRow[]) {
      if (!metricValues.has(row.metric)) {
        metricValues.set(row.metric, Number(row.value ?? 0));
      }
    }

    const missing = requiredMetrics.filter((metric) => !metricValues.has(metric));
    if (missing.length > 0) {
      throw new Error(`Données GreenMetric incomplètes: ${missing.join(", ")}`);
    }

    return {
      categories: greenMetricCategoryDefinitions.map((category) => {
        const score = metricValues.get(category.metric) ?? 0;
        const percentage = roundOne((score / category.max) * 100);

        return {
          ...category,
          score,
          percentage,
          status: strategyStatusFor(percentage),
        };
      }),
      sourceNote: "Données Supabase · table kpis · dernière période disponible.",
    };
  } catch (error) {
    console.warn(
      "GreenMetric category scores fallback:",
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

function setDocTextColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDocFillColor(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDocDrawColor(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function formatStrategyIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addAstariaMark(doc: jsPDF, x: number, y: number, size: number) {
  setDocFillColor(doc, jadeDeep);
  doc.roundedRect(x, y, size, size, 2.4, 2.4, "F");
  setDocFillColor(doc, jadePrimary);
  doc.roundedRect(x + 1.1, y + 1.1, size - 2.2, size - 2.2, 2, 2, "F");
  setDocDrawColor(doc, jadeSoft);
  doc.setLineWidth(0.8);
  doc.line(x + size * 0.25, y + size * 0.76, x + size * 0.77, y + size * 0.27);
  setDocFillColor(doc, jadeSoft);
  doc.ellipse(x + size * 0.38, y + size * 0.63, size * 0.1, size * 0.045, "F");
  doc.ellipse(x + size * 0.52, y + size * 0.5, size * 0.1, size * 0.045, "F");
  doc.ellipse(x + size * 0.66, y + size * 0.37, size * 0.1, size * 0.045, "F");
}

function strategyEyebrow(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setDocTextColor(doc, jadePrimary);
  doc.text(text.toUpperCase(), x, y);
}

function strategyHeading(doc: jsPDF, title: string, y: number) {
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  setDocTextColor(doc, jadeDeep);
  doc.text(title, 14, y);
}

function addStrategyPageHeader(doc: jsPDF, eyebrow: string, title: string) {
  setDocFillColor(doc, jadeDeep);
  doc.rect(0, 0, 210, 12, "F");
  addAstariaMark(doc, 180, 18, 12);
  strategyEyebrow(doc, eyebrow, 14, 22);
  strategyHeading(doc, title, 32);
  setDocDrawColor(doc, jadeSoft);
  doc.setLineWidth(0.4);
  doc.line(14, 36, 196, 36);
}

function addStrategyFooter(doc: jsPDF, isoDate: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setDocTextColor(doc, muted);
    doc.text(`${page}/${pageCount} · Mission verte · UCAR · 2026 · ${isoDate}`, 14, 286);
  }
}

function addStrategyCover(doc: jsPDF, generatedAt: Date, dateText: string) {
  setDocFillColor(doc, [247, 250, 248]);
  doc.rect(0, 0, 210, 297, "F");
  setDocFillColor(doc, jadeDeep);
  doc.rect(0, 0, 210, 58, "F");
  setDocFillColor(doc, jadeSoft);
  doc.rect(0, 58, 210, 2.4, "F");

  addAstariaMark(doc, 14, 84, 24);
  strategyEyebrow(doc, "UCAR GreenMetric", 14, 122);
  doc.setFont("times", "bold");
  doc.setFontSize(29);
  setDocTextColor(doc, jadeDeep);
  doc.text("Plan stratégique GreenMetric", 14, 140);
  doc.text("UCAR · 2026", 14, 154);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  setDocTextColor(doc, muted);
  doc.text("Vers le top 500 d'ici 2027", 14, 169);
  setDocFillColor(doc, jadeGlow);
  doc.rect(14, 180, 68, 1.2, "F");

  setDocFillColor(doc, [235, 243, 237]);
  doc.roundedRect(14, 194, 182, 36, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setDocTextColor(doc, jadeDeep);
  doc.text("Édition", 22, 208);
  doc.setFont("helvetica", "normal");
  setDocTextColor(doc, ink);
  doc.text(dateText, 52, 208);
  doc.setFont("helvetica", "bold");
  setDocTextColor(doc, jadeDeep);
  doc.text("Mission", 22, 220);
  doc.setFont("helvetica", "normal");
  setDocTextColor(doc, ink);
  doc.text("#688 → top 500 · +940 pts · ~1,5M TND · 12 mois", 52, 220);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setDocTextColor(doc, muted);
  doc.text(
    "Préparé par Astaria, agente stratégique de la Présidence UCAR",
    14,
    260,
  );
  doc.text(formatStrategyIsoDate(generatedAt), 14, 270);
}

function addSummaryCards(doc: jsPDF) {
  const cards = [
    ["Position actuelle", "#688 mondial · 6 260/10 000 (62,6%) · #1 en Tunisie"],
    ["Cible", "~7 200 points (+940) · top 500 d'ici fin 2026"],
    ["Investissement", "~1,5M TND Année 1"],
    ["Calendrier", "12 mois, en 3 phases"],
    [
      "Alignement financement",
      "RESPIRE Composante 1 (lien indirect, ~30% éligible)",
    ],
  ];

  autoTable(doc, {
    startY: 48,
    head: [["Indicateur", "Synthèse exécutive"]],
    body: cards,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 4,
      font: "helvetica",
      fontSize: 10,
      lineColor: [221, 231, 224],
      lineWidth: 0.15,
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", textColor: jadeDeep },
      1: { cellWidth: 130 },
    },
  });
}

function addCategoryTable(
  doc: jsPDF,
  categories: GreenMetricPdfCategory[],
  sourceNote: string,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setDocTextColor(doc, muted);
  doc.text(sourceNote, 14, 46);

  autoTable(doc, {
    startY: 56,
    head: [["Code", "Catégorie", "Score", "Max", "%", "Statut"]],
    body: categories.map((category) => [
      category.code,
      `${category.code} · ${category.label}`,
      formatNumber(category.score),
      formatNumber(category.max),
      `${formatNumber(category.percentage)}%`,
      category.status,
    ]),
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 3,
      font: "helvetica",
      fontSize: 9,
      lineColor: [221, 231, 224],
      lineWidth: 0.15,
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 30, halign: "center" },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index === 5) {
        const fillColor = strategyStatusColor(String(data.cell.raw));
        data.cell.styles.fillColor = fillColor;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
}

function addPhasePage(doc: jsPDF, phase: GreenMetricPdfPhase, pageLabel: string) {
  doc.addPage();
  addStrategyPageHeader(doc, pageLabel, `${phase.title} (${phase.period})`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setDocTextColor(doc, jadePrimary);
  doc.text(`Target: +${formatNumber(phase.targetPoints)} pts · ${phase.targetCost}`, 14, 48);

  autoTable(doc, {
    startY: 58,
    head: [["ID", "Action", "Catégorie", "Impact", "Coût", "Délai"]],
    body: phase.actions.map((action) => [
      action.id,
      action.action,
      action.category,
      `+${formatNumber(action.impact)}`,
      action.cost,
      action.delay,
    ]),
    theme: "grid",
    margin: { left: 12, right: 12 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 2.2,
      font: "helvetica",
      fontSize: 7.8,
      lineColor: [221, 231, 224],
      lineWidth: 0.12,
      overflow: "linebreak",
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: "bold", textColor: jadeDeep },
      1: { cellWidth: 84 },
      2: { cellWidth: 29 },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 16 },
    },
  });

  const y = finalY(doc, 150) + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  setDocTextColor(doc, muted);
  doc.text(phase.totalNote, 14, y);
}

async function generateGreenMetricStrategyReport(
  supabase: ReportSupabase,
  period: string,
) {
  const generatedAt = new Date();
  const dateText = formatDateLong(generatedAt);
  const isoDate = formatStrategyIsoDate(generatedAt);
  const filename = "Plan-Strategique-GreenMetric-UCAR-2026.pdf";
  const { categories, sourceNote } = await loadGreenMetricPdfCategories(supabase);
  const doc = new jsPDF();

  addStrategyCover(doc, generatedAt, dateText);

  doc.addPage();
  addStrategyPageHeader(doc, "Page 2 · Executive summary", "Synthèse exécutive");
  addSummaryCards(doc);
  let y = finalY(doc, 120) + 14;
  writeLines(
    doc,
    [
      "Move UCAR from #688 mondial to top 500 by end of 2026 cycle.",
      "Current score: 6 260 / 10 000. Target: ~7 200 (+940 points).",
      "Investment year-1: ~1.5M TND. Funding alignment: RESPIRE Composante 1 (indirect).",
    ],
    14,
    y,
    { width: 176, lineHeight: 6 },
  );

  doc.addPage();
  addStrategyPageHeader(
    doc,
    "Page 3 · État des lieux",
    "État des lieux par catégorie",
  );
  addCategoryTable(doc, categories, sourceNote);

  addPhasePage(doc, greenMetricPdfPhases[0], "Page 4 · Phase 1");
  addPhasePage(doc, greenMetricPdfPhases[1], "Page 5 · Phase 2");
  addPhasePage(doc, greenMetricPdfPhases[2], "Page 6 · Phase 3");

  doc.addPage();
  addStrategyPageHeader(doc, "Page 7 · Budget", "Budget et financement");
  autoTable(doc, {
    startY: 48,
    head: [["Phase", "Points", "Coût", "Cumulatif"]],
    body: greenMetricBudgetRows,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 3,
      font: "helvetica",
      fontSize: 9,
      lineColor: [221, 231, 224],
      lineWidth: 0.15,
      textColor: ink,
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    didParseCell: (data: CellHookData) => {
      if (
        data.section === "body" &&
        data.row.index === greenMetricBudgetRows.length - 1
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [235, 243, 237];
        data.cell.styles.textColor = jadeDeep;
      }
    },
  });

  y = finalY(doc, 100) + 12;
  strategyEyebrow(doc, "Sources de financement", 14, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Source", "Utilisation / logique"]],
    body: greenMetricFundingSources,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 2.6,
      font: "helvetica",
      fontSize: 8.2,
      lineColor: [221, 231, 224],
      lineWidth: 0.12,
      overflow: "linebreak",
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: "bold", textColor: jadeDeep },
      1: { cellWidth: 120 },
    },
  });
  y = finalY(doc, 170) + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  setDocTextColor(doc, muted);
  doc.text(
    "Add organisational overhead, contingency, training, evidence preparation: ~1.5M TND total Année 1.",
    14,
    y,
  );

  doc.addPage();
  addStrategyPageHeader(doc, "Page 8 · Outcome", "Projected outcome");
  autoTable(doc, {
    startY: 50,
    head: [["Year", "Score", "Mondial", "National"]],
    body: [
      ["2025 (current)", "6 260", "#688", "#1"],
      ["2026 (post-plan)", "~7 200", "top 500", "#1"],
      ["2027 (sustained)", "~7 800", "top 400 (stretch)", "#1"],
    ],
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 5,
      font: "helvetica",
      fontSize: 10,
      lineColor: [221, 231, 224],
      lineWidth: 0.15,
      textColor: ink,
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "center" },
      3: { halign: "center" },
    },
  });
  y = finalY(doc, 110) + 20;
  doc.setFont("times", "italic");
  doc.setFontSize(17);
  setDocTextColor(doc, jadeDeep);
  doc.text(
    "La première université tunisienne à franchir le top 500 mondial sur la durabilité.",
    14,
    y,
    { maxWidth: 174 },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setDocTextColor(doc, muted);
  doc.text("Defendable, measurable, achievable.", 14, y + 24);

  doc.addPage();
  addStrategyPageHeader(
    doc,
    "Page 9 · Sources",
    "Sources et méthodologie",
  );
  autoTable(doc, {
    startY: 48,
    head: [["Sources"]],
    body: [
      ["uigreenmetric.com · Édition 2025"],
      ["Neos Brief 05 — framework UCAR scoring (avril 2026)"],
      ["Validation terrain · ENSTAB Borj Cédria · 25-26 avril 2026"],
      ["INSAT TEEP · 206kW solaire (référence régionale)"],
      ["data.gov.tn · datasets éducation officiels"],
      ["Pr. Nadia Mzoughi Aguir · directives Présidence UCAR"],
    ],
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 2.4,
      font: "helvetica",
      fontSize: 8.4,
      lineColor: [221, 231, 224],
      lineWidth: 0.12,
      textColor: ink,
    },
  });

  y = finalY(doc, 98) + 10;
  strategyEyebrow(doc, "Sequencing logic", 14, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Point", "Méthode"]],
    body: greenMetricSequencing,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 2.2,
      font: "helvetica",
      fontSize: 7.6,
      lineColor: [221, 231, 224],
      lineWidth: 0.12,
      overflow: "linebreak",
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", textColor: jadeDeep },
      1: { cellWidth: 130 },
    },
  });

  y = finalY(doc, 160) + 10;
  strategyEyebrow(doc, "Action dependencies", 14, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Dépendance", "Logique"]],
    body: greenMetricDependencies,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: jadeDeep, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [246, 250, 247] },
    styles: {
      cellPadding: 2.1,
      font: "helvetica",
      fontSize: 7.3,
      lineColor: [221, 231, 224],
      lineWidth: 0.12,
      overflow: "linebreak",
      textColor: ink,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold", textColor: jadeDeep },
      1: { cellWidth: 140 },
    },
  });

  addStrategyFooter(doc, isoDate);
  const pdf = doc.output("arraybuffer");

  if (supabase) {
    const { error: reportError } = await supabase.from("reports").insert({
      institution_id: null,
      period,
      type: "greenmetric_strategy",
      content: filename,
      generated_at: generatedAt.toISOString(),
    });

    if (reportError) {
      console.warn("GreenMetric report log skipped:", reportError.message);
    }
  }

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function generateCycleReportPdf(
  supabase: ReportSupabase,
  cycle: CycleReportPayload,
) {
  const generatedAt = new Date(cycle.finishedAt);
  const dateText = formatDateLong(generatedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const filenameStamp = `${generatedAt.getFullYear()}-${pad(
    generatedAt.getMonth() + 1,
  )}-${pad(generatedAt.getDate())}-${pad(generatedAt.getHours())}-${pad(
    generatedAt.getMinutes(),
  )}`;
  const filename = `Rapport-Surveillance-UCAR-${filenameStamp}.pdf`;

  const doc = new jsPDF();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(9, 9, 11);
  doc.text("Rapport du cycle de surveillance", 14, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(82, 82, 91);
  doc.text(`Université de Carthage · Tanit · ${dateText}`, 14, 34);
  doc.setDrawColor(41, 124, 233);
  doc.setLineWidth(0.8);
  doc.line(14, 38, 80, 38);

  let y = 50;
  sectionTitle(doc, "Synthèse", y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(63, 63, 70);

  const synth = [
    [`${cycle.checked}`, "établissements vérifiés"],
    [`${cycle.missingFound}`, "manquants détectés"],
    [`${cycle.actionsCreated}`, "nouvelles actions créées"],
    [
      `${cycle.newAlertsCount}`,
      `alerte${cycle.newAlertsCount === 1 ? "" : "s"} critique${
        cycle.newAlertsCount === 1 ? "" : "s"
      } générée${cycle.newAlertsCount === 1 ? "" : "s"}`,
    ],
    [
      `${cycle.conformInstitutionsCount}`,
      `établissement${cycle.conformInstitutionsCount === 1 ? "" : "s"} conforme${
        cycle.conformInstitutionsCount === 1 ? "" : "s"
      }`,
    ],
  ];
  for (const [count, label] of synth) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(9, 9, 11);
    doc.text(count, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(63, 63, 70);
    doc.text(label, 30, y);
    y += 7;
  }

  y += 6;
  const actioned = cycle.perInstitutionResults.filter((r) => r.actionTaken);
  const terminal = cycle.perInstitutionResults.filter((r) => !r.actionTaken);

  if (actioned.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    sectionTitle(doc, "Actions par établissement", y);
    autoTable(doc, {
      startY: y + 6,
      head: [["Établissement", "Gouvernorat", "Action", "Notes"]],
      body: actioned.map((r) => [
        r.institutionAcronym,
        r.governorate || "—",
        r.actionLabel,
        r.notes,
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 124, 233] },
      styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2.4 },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 28 },
        2: { cellWidth: 36 },
        3: { cellWidth: 90 },
      },
    });
    y = finalY(doc, y + 30) + 12;
  }

  if (terminal.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    sectionTitle(doc, "Déjà escaladé · aucune nouvelle action", y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(63, 63, 70);
    const terminalLine = terminal
      .map((r) => r.institutionAcronym)
      .join(" · ");
    const wrapped = doc.splitTextToSize(terminalLine, 176) as string[];
    doc.text(wrapped, 14, y);
    y += wrapped.length * 6 + 4;
  }

  if (cycle.actionsCreated === 0 && cycle.missingFound > 0) {
    y = ensurePageSpace(doc, y + 4, 30);
    doc.setFillColor(236, 253, 245);
    doc.rect(14, y - 4, 182, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text("Système à jour", 18, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(63, 63, 70);
    doc.text(
      "Toutes les institutions manquantes ont déjà été notifiées et escaladées.",
      18,
      y + 12,
    );
    y += 30;
  }

  addFooter(doc, dateText);
  const pdf = doc.output("arraybuffer");

  if (supabase) {
    const { error: reportError } = await supabase.from("reports").insert({
      institution_id: null,
      period: "2024-2025",
      type: "cycle_report",
      content: filename,
      generated_at: generatedAt.toISOString(),
    });

    if (reportError) {
      console.warn("Cycle report log skipped:", reportError.message);
    }
  }

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<ReportRequest>(request);
    const type = body.type || "RAP";

    if (type === "cycle_report") {
      if (!body.cycle) {
        throw new ApiError("Champ requis invalide: cycle", 400);
      }
      const supabase = missingSupabaseEnv(true).length
        ? null
        : getSupabaseAdmin();
      return await generateCycleReportPdf(supabase, body.cycle);
    }

    const period =
      type === "greenmetric_strategy"
        ? body.period?.trim() || "2025"
        : requiredString(body.period, "period");
    const institutionId = body.institutionId || null;

    if (type === "greenmetric_strategy") {
      const supabase = missingSupabaseEnv(true).length
        ? null
        : getSupabaseAdmin();
      return await generateGreenMetricStrategyReport(supabase, period);
    }

    if (missingSupabaseEnv(true).length > 0) {
      return generateDemoInstitutionReport(period, type);
    }

    const supabase = getSupabaseAdmin();
    const institutionResult = institutionId
      ? await supabase
          .from("institutions")
          .select("id, code, name_fr, acronym, governorate, type")
          .eq("id", institutionId)
          .maybeSingle()
      : { data: null, error: null };

    if (institutionResult.error) {
      throw institutionResult.error;
    }

    if (institutionId && !institutionResult.data) {
      throw new ApiError("Etablissement introuvable", 404);
    }

    let kpiQuery = supabase
      .from("kpis")
      .select(
        "institution_id, domain, metric, value, period, institutions(name_fr, acronym)",
      )
      .eq("period", period);
    let alertQuery = supabase
      .from("alerts")
      .select("id, institution_id, metric, severity, message, value, threshold, resolved, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    if (institutionId) {
      kpiQuery = kpiQuery.eq("institution_id", institutionId);
      alertQuery = alertQuery.eq("institution_id", institutionId);
    }

    const [kpiResult, alertResult] = await Promise.all([kpiQuery, alertQuery]);

    if (kpiResult.error) {
      throw kpiResult.error;
    }
    if (alertResult.error) {
      throw alertResult.error;
    }

    const institution = institutionResult.data as InstitutionRow | null;
    const titleName = institution?.name_fr ?? "Université de Carthage";
    const acronym = institution?.acronym ?? "UCAR";
    const kpis = (kpiResult.data ?? []) as unknown as KpiWithInstitution[];
    const alerts = (alertResult.data ?? []) as AlertRow[];
    const includeInstitution = !institutionId;

    const doc = new jsPDF();
    const generatedAt = new Date();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Rapport Annuel de Performance - ${titleName}`, 14, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Période: ${period}`, 14, 30);
    doc.text("Généré par: Tanit · Université de Carthage", 14, 36);
    doc.text(`Date: ${generatedAt.toLocaleDateString("fr-FR")}`, 14, 42);

    const academicHead = includeInstitution
      ? [["Etablissement", "Indicateur", "Valeur", "Période"]]
      : [["Indicateur", "Valeur", "Période"]];
    const academicRows = tableRows(
      kpis,
      ["effectif_etudiants", "diplomes", "taux_reussite"],
      includeInstitution,
    );

    autoTable(doc, {
      startY: 52,
      head: academicHead,
      body: academicRows.length
        ? academicRows
        : [
            includeInstitution
              ? ["-", "-", "Aucune donnée", period]
              : ["-", "Aucune donnée", period],
          ],
      theme: "striped",
      headStyles: { fillColor: [28, 93, 84] },
    });

    const hrHead = academicHead;
    const hrRows = tableRows(kpis, ["effectif_enseignants"], includeInstitution);
    autoTable(doc, {
      startY: finalY(doc, 52) + 10,
      head: hrHead,
      body: hrRows.length
        ? hrRows
        : [
            includeInstitution
              ? ["-", "-", "Aucune donnée", period]
              : ["-", "Aucune donnée", period],
          ],
      theme: "striped",
      headStyles: { fillColor: [28, 93, 84] },
    });

    const alertHead = includeInstitution
      ? [["Etablissement", "Indicateur", "Sévérité", "Message"]]
      : [["Indicateur", "Sévérité", "Message"]];
    const alertRows = alerts.map((alert) =>
      includeInstitution
        ? [
            alert.institution_id,
            alert.metric,
            alert.severity,
            alert.message,
          ]
        : [alert.metric, alert.severity, alert.message],
    );
    autoTable(doc, {
      startY: finalY(doc, 80) + 10,
      head: alertHead,
      body: alertRows.length
        ? alertRows
        : [
            includeInstitution
              ? ["-", "-", "Aucune alerte active", ""]
              : ["-", "Aucune alerte active", ""],
          ],
      theme: "striped",
      headStyles: { fillColor: [121, 49, 43] },
      styles: { overflow: "linebreak" },
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(9);
      doc.text("Généré automatiquement par Tanit", 14, 286);
      doc.text(`${page}/${pageCount}`, 190, 286, { align: "right" });
    }

    const filename = `${safeSegment(type)}-${safeSegment(acronym)}-${safeSegment(
      period,
    )}.pdf`;
    const pdf = doc.output("arraybuffer");

    const { error: reportError } = await supabase.from("reports").insert({
      institution_id: institutionId,
      period,
      type,
      content: filename,
      generated_at: generatedAt.toISOString(),
    });

    if (reportError) {
      throw reportError;
    }

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
