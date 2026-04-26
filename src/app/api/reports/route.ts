import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  label: string;
  score: number;
  max: number;
  percentage: number;
  status: string;
};

type GreenMetricPdfAction = {
  action: string;
  impact: string;
  cost: string;
  delay: string;
};

type GreenMetricPdfPhase = {
  title: string;
  points: string;
  actions: GreenMetricPdfAction[];
};

type ReportSupabase = ReturnType<typeof getSupabaseAdmin> | null;

const greenMetricPdfCategories: GreenMetricPdfCategory[] = [
  {
    code: "SI",
    label: "Infrastructure et aménagement",
    score: 1225,
    max: 1500,
    percentage: 81.7,
    status: "Solide",
  },
  {
    code: "EC",
    label: "Énergie et climat",
    score: 1375,
    max: 2100,
    percentage: 65.5,
    status: "À renforcer",
  },
  {
    code: "WS",
    label: "Gestion des déchets",
    score: 650,
    max: 1800,
    percentage: 36.1,
    status: "Sous-performant",
  },
  {
    code: "WR",
    label: "Gestion de l'eau",
    score: 437.5,
    max: 1000,
    percentage: 43.8,
    status: "Sous-performant",
  },
  {
    code: "TR",
    label: "Transport",
    score: 1022.5,
    max: 1800,
    percentage: 56.8,
    status: "À renforcer",
  },
  {
    code: "ED",
    label: "Éducation et recherche",
    score: 1550,
    max: 1800,
    percentage: 86.1,
    status: "Solide",
  },
];

const greenMetricPdfPhases: GreenMetricPdfPhase[] = [
  {
    title: "Phase 1 — Politiques et gains rapides (Mois 1-3) — +300 pts",
    points: "+300 pts",
    actions: [
      {
        action: "Interdiction du plastique à usage unique (décret UCAR)",
        impact: "WS.2 +200 pts",
        cost: "0 TND",
        delay: "1 semaine",
      },
      {
        action: "Bacs de tri colorés dans les 33 établissements",
        impact: "WS.1 + WS.4 +150 pts",
        cost: "100K TND",
        delay: "1 mois",
      },
      {
        action: "Programme de tests de qualité de l'eau (FSB)",
        impact: "WR.5 +150 pts",
        cost: "15K TND/an",
        delay: "Immédiat",
      },
      {
        action: "Formalisation cellule coordination développement durable",
        impact: "ED.13 +30 pts",
        cost: "0 TND",
        delay: "1 mois",
      },
      {
        action: "Cartographie standardisée des 33 campus",
        impact: "SI.1-5 +100 pts",
        cost: "30K TND",
        delay: "2 mois",
      },
    ],
  },
  {
    title: "Phase 2 — Infrastructure (Mois 4-8) — +400 pts",
    points: "+400 pts",
    actions: [
      {
        action: "Robinetterie économe (15 établissements pilotes)",
        impact: "WR.3 +100 pts",
        cost: "75K TND",
        delay: "4 mois",
      },
      {
        action: "Récupération d'eau de pluie (10 établissements)",
        impact: "WR.2 +100 pts",
        cost: "100K TND",
        delay: "6 mois",
      },
      {
        action: "Compostage cafétérias (10 plus grands établissements)",
        impact: "WS.3 +200 pts",
        cost: "50K TND",
        delay: "5 mois",
      },
      {
        action: "Trous d'infiltration (volontaires étudiants)",
        impact: "WR.1 + SI.4 +50 pts",
        cost: "5K TND",
        delay: "2 mois",
      },
      {
        action: "Collecte certifiée des e-déchets (UCAR)",
        impact: "WS.5 +200 pts",
        cost: "10K TND/an",
        delay: "3 mois",
      },
    ],
  },
  {
    title: "Phase 3 — Mesure et reporting (Mois 9-12) — +240 pts",
    points: "+240 pts",
    actions: [
      {
        action: "Compteurs intelligents énergie (10 établissements)",
        impact: "EC.4 + EC.11 +100 pts",
        cost: "100K TND",
        delay: "4 mois",
      },
      {
        action: "Audit complet des déchets",
        impact: "Base WS +100 pts",
        cost: "20K TND",
        delay: "3 mois",
      },
      {
        action: "Formation 33 référents GreenMetric",
        impact: "Qualité dossier +40 pts",
        cost: "5K TND",
        delay: "2 mois",
      },
    ],
  },
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

async function generateGreenMetricStrategyReport(
  supabase: ReportSupabase,
  period: string,
) {
  const generatedAt = new Date();
  const dateText = formatDateLong(generatedAt);
  const filename = "Plan-Strategique-GreenMetric-UCAR-2026.pdf";
  const doc = new jsPDF();

  doc.setFillColor(13, 13, 15);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(249, 250, 251);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Plan Stratégique GreenMetric", 14, 72);
  doc.setFontSize(16);
  doc.text("Université de Carthage · 2026", 14, 88);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(212, 212, 216);
  doc.text("Généré par Tanit · Plateforme intelligente UCAR", 14, 104);
  doc.text(dateText, 14, 114);
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1.2);
  doc.line(14, 128, 116, 128);
  doc.setFontSize(10);
  doc.setTextColor(161, 161, 170);
  doc.text("Objectif: top 500 mondial en 12 mois", 14, 146);
  doc.text("Priorités: déchets et eau", 14, 154);

  doc.addPage();
  sectionTitle(doc, "Section 1 — État actuel", 20);
  let y = writeLines(
    doc,
    [
      "UCAR: #688 mondial, #1 Tunisie",
      "Score 6 260 / 10 000",
      "Les catégories faibles sont la gestion des déchets et la gestion de l'eau.",
    ],
    14,
    32,
  );

  autoTable(doc, {
    startY: y + 4,
    head: [["Code", "Catégorie", "Score / max", "Pourcentage", "Statut"]],
    body: greenMetricPdfCategories.map((category) => [
      category.code,
      category.label,
      `${formatNumber(category.score)} / ${formatNumber(category.max)}`,
      `${formatNumber(category.percentage)}%`,
      category.status,
    ]),
    theme: "striped",
    headStyles: { fillColor: [28, 93, 84] },
    styles: { fontSize: 9 },
  });

  y = finalY(doc, 82) + 14;
  sectionTitle(doc, "Section 2 — Objectif", y);
  y = writeLines(
    doc,
    [
      "Cible: Top 500 mondial (~7 200 points)",
      "Écart: +940 points",
      "Horizon: 12 mois",
    ],
    14,
    y + 12,
  );

  doc.addPage();
  sectionTitle(doc, "Section 3 — Plan en 3 phases", 20);
  y = 32;
  for (const phase of greenMetricPdfPhases) {
    y = ensurePageSpace(doc, y, 58);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(phase.title, 14, y);

    autoTable(doc, {
      startY: y + 6,
      head: [["Action", "Impact", "Coût", "Délai"]],
      body: phase.actions.map((action) => [
        action.action,
        action.impact,
        action.cost,
        action.delay,
      ]),
      theme: "striped",
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 8.5, overflow: "linebreak", cellPadding: 2.2 },
      columnStyles: {
        0: { cellWidth: 86 },
        1: { cellWidth: 42 },
        2: { cellWidth: 26 },
        3: { cellWidth: 24 },
      },
    });
    y = finalY(doc, y + 48) + 12;
  }

  doc.addPage();
  sectionTitle(doc, "Section 4 — Investissement et financement", 20);
  y = writeLines(
    doc,
    [
      "Total Année 1: ~1.5M TND",
      "Sources possibles:",
      "• RESPIRE Composante 1 (Banque mondiale): bacs, eau, énergie — alignement indirect",
      "• Budget MESRS maintenance: robinetterie, audits, tests",
      "• Volontariat étudiants: trous d'infiltration, sensibilisation",
    ],
    14,
    32,
  );

  y = ensurePageSpace(doc, y + 10, 45);
  sectionTitle(doc, "Section 5 — Projection", y);
  y = writeLines(
    doc,
    [
      "Score actuel 2025: 6 260",
      "Score projeté 2026: 7 200",
      "Position projetée: top 500 mondial",
      "Maintien du rang #1 Tunisie",
    ],
    14,
    y + 12,
  );

  y = ensurePageSpace(doc, y + 10, 70);
  sectionTitle(doc, "Section 6 — Notes méthodologiques", y);
  y = writeLines(
    doc,
    [
      "• Méthodologie UI GreenMetric 2025",
      "• Benchmarks top 100 (Universitas Indonesia, Wageningen, Nottingham, Telkom)",
      "• Coûts estimés sur projets comparables Tunisie/international",
      "• Le lien GreenMetric ↔ RESPIRE est indirect : les infrastructures qui améliorent le score correspondent aux critères d'investissement de RESPIRE Composante 1",
    ],
    14,
    y + 12,
  );

  y = ensurePageSpace(doc, y + 10, 45);
  sectionTitle(doc, "Section 7 — Sources", y);
  writeLines(
    doc,
    [
      "• uigreenmetric.com (2025)",
      "• UCAR — base de données Tanit (33 établissements)",
      "• ITES/IACE, INS Q4 2025 (contexte national)",
    ],
    14,
    y + 12,
  );

  addFooter(doc, dateText);
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
