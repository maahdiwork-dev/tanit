import type {
  Alert,
  AuditLogEntry,
  DashboardSummary,
  GreenMetricSummary,
  InstitutionListItem,
  Prediction,
  SubmitResponse,
} from "@/types/api";

const now = "2026-04-26T08:30:00.000Z";

export function demoInstitutions(): InstitutionListItem[] {
  return [
    {
      id: "demo-enib",
      code: "031",
      acronym: "ENIB",
      name_fr: "Ecole Nationale d'Ingenieurs de Bizerte",
      governorate: "Bizerte",
      submissionStatus: "missing",
      submittedAt: null,
      lastAction: "Rappel envoyé il y a 1 jour",
    },
    {
      id: "demo-isg",
      code: "014",
      acronym: "ISG",
      name_fr: "Institut Superieur de Gestion de Tunis",
      governorate: "Tunis",
      submissionStatus: "missing",
      submittedAt: null,
      lastAction: "Demande envoyée il y a 2 jours",
    },
    {
      id: "demo-fst",
      code: "005",
      acronym: "FST",
      name_fr: "Faculte des Sciences de Tunis",
      governorate: "Tunis",
      submissionStatus: "missing",
      submittedAt: null,
      lastAction: "Escalade en cours il y a 3 jours",
    },
    {
      id: "demo-insat",
      code: "021",
      acronym: "INSAT",
      name_fr: "Institut National des Sciences Appliquees et de Technologie",
      governorate: "Tunis",
      submissionStatus: "submitted",
      submittedAt: "2026-04-24T10:00:00.000Z",
      lastAction: "Soumis il y a 2 jours",
    },
    {
      id: "demo-ept",
      code: "022",
      acronym: "EPT",
      name_fr: "Ecole Polytechnique de Tunisie",
      governorate: "Ariana",
      submissionStatus: "submitted",
      submittedAt: "2026-04-23T14:30:00.000Z",
      lastAction: "Soumis il y a 3 jours",
    },
  ];
}

export function demoDashboardSummary(): DashboardSummary {
  return {
    totalInstitutions: 33,
    submittedCount: 30,
    missingCount: 3,
    complianceRate: 91,
    totalStudents: 35622,
    activeAlerts: 2,
    criticalAlerts: 1,
    trendVsPrevious: "up",
  };
}

export function demoAlerts(resolved = false): Alert[] {
  if (resolved) return [];
  return [
    {
      id: "demo-alert-enib",
      institutionId: "demo-enib",
      institutionName: "Ecole Nationale d'Ingenieurs de Bizerte",
      institutionAcronym: "ENIB",
      metric: "submission_absence",
      severity: "critical",
      value: 0,
      threshold: 1,
      message: "Aucune soumission KPI reçue pour la période 2024-2025.",
      createdAt: now,
      resolved: false,
    },
    {
      id: "demo-alert-fst",
      institutionId: "demo-fst",
      institutionName: "Faculte des Sciences de Tunis",
      institutionAcronym: "FST",
      metric: "taux_reussite",
      severity: "warning",
      value: 62,
      threshold: 70,
      message: "Taux de réussite sous le seuil attendu.",
      createdAt: "2026-04-25T09:15:00.000Z",
      resolved: false,
    },
  ];
}

export function demoAuditEntries(options: {
  institutionId?: string | null;
  limit?: number;
} = {}): AuditLogEntry[] {
  const rows: AuditLogEntry[] = [
    {
      id: "demo-audit-1",
      actor: "Tanit Coordination Agent",
      action: "request_sent",
      target: "demo-isg",
      targetAcronym: "ISG",
      details: "Demande de soumission envoyée - période 2024-2025",
      createdAt: "2026-04-24T09:00:00.000Z",
    },
    {
      id: "demo-audit-2",
      actor: "Tanit Coordination Agent",
      action: "reminder_sent",
      target: "demo-enib",
      targetAcronym: "ENIB",
      details: "Rappel envoyé - aucune réponse depuis 24h",
      createdAt: "2026-04-25T09:00:00.000Z",
    },
    {
      id: "demo-audit-3",
      actor: "Tanit Coordination Agent",
      action: "escalation_pending",
      target: "demo-fst",
      targetAcronym: "FST",
      details: "Escalade en cours - aucune réponse après 48h",
      createdAt: now,
    },
  ];

  return rows
    .filter((row) => !options.institutionId || row.target === options.institutionId)
    .slice(0, options.limit ?? rows.length);
}

export function demoPredictions(): Prediction[] {
  return [
    {
      id: "demo-prediction-fst",
      institutionAcronym: "FST",
      institutionName: "Faculte des Sciences de Tunis",
      metric: "taux_reussite",
      currentValue: 62,
      trend: "down",
      trendData: [75, 71, 68, 62],
      trendYears: ["2021", "2022", "2023", "2024"],
      predictedValue: 59,
      predictedPeriod: "2025",
      confidence: 0.84,
      message: "Risque de baisse continue sans action corrective.",
    },
  ];
}

export function demoGreenMetricSummary(): GreenMetricSummary {
  return {
    worldRank: 688,
    nationalRank: 1,
    totalScore: 6260,
    maxScore: 10000,
    percentage: 62.6,
    year: 2025,
    categories: [
      {
        code: "SI",
        label: "Infrastructure et aménagement",
        description: "Espaces verts, accessibilité, sécurité",
        score: 1225,
        max: 1500,
        percentage: 81.7,
        status: "strong",
      },
      {
        code: "EC",
        label: "Énergie et climat",
        description: "Consommation, énergies renouvelables, GES",
        score: 1375,
        max: 2100,
        percentage: 65.5,
        status: "medium",
      },
      {
        code: "WS",
        label: "Gestion des déchets",
        description: "Tri, recyclage, traitement, déchets toxiques",
        score: 650,
        max: 1800,
        percentage: 36.1,
        status: "weak",
      },
      {
        code: "WR",
        label: "Gestion de l'eau",
        description: "Conservation, recyclage, qualité",
        score: 437.5,
        max: 1000,
        percentage: 43.8,
        status: "weak",
      },
      {
        code: "TR",
        label: "Transport",
        description: "Mobilité durable, ZEV, parking, piétons",
        score: 1022.5,
        max: 1800,
        percentage: 56.8,
        status: "medium",
      },
      {
        code: "ED",
        label: "Éducation et recherche",
        description: "Cours, publications, événements durabilité",
        score: 1550,
        max: 1800,
        percentage: 86.1,
        status: "strong",
      },
    ],
    weakCategories: ["WR", "WS"],
    source: "uigreenmetric.com",
    period: "2025",
  };
}

export function demoInstitutionExportRows() {
  return demoInstitutions().map((institution) => ({
    code: institution.code,
    acronym: institution.acronym,
    name_fr: institution.name_fr,
    name_ar: "",
    governorate: institution.governorate,
    type: "demo",
    status: institution.submissionStatus,
    submitted_at: institution.submittedAt ?? "",
    last_action: institution.lastAction,
  }));
}

export function demoSubmitResponse(): SubmitResponse {
  return {
    success: true,
    submissionId: "demo-submission",
    validations: {
      valid: true,
      issues: [
        {
          message:
            "Mode démo: les KPIs sont validés localement, sans écriture Supabase.",
          severity: "info",
        },
      ],
    },
    anomaliesDetected: 0,
    newAlerts: [],
  };
}
