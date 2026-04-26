export type SubmissionStatus = "submitted" | "missing";

export type Domain =
  | "academic"
  | "finance"
  | "hr"
  | "research"
  | "esg"
  | "infrastructure";

export type AlertSeverity = "critical" | "warning" | "info";

export type TrendDirection = "up" | "down" | "stable";

export type ReportType = "RAP" | "PAP" | "greenmetric_strategy" | "cycle_report";

export type ApiErrorResponse = {
  error: string;
  status: number;
};

export type DashboardSummary = {
  totalInstitutions: number;
  submittedCount: number;
  missingCount: number;
  complianceRate: number;
  totalStudents: number;
  activeAlerts: number;
  criticalAlerts: number;
  trendVsPrevious: TrendDirection;
};

export type GreenMetricCategoryCode =
  | "SI"
  | "EC"
  | "WS"
  | "WR"
  | "TR"
  | "ED";

export type GreenMetricCategoryStatus = "strong" | "medium" | "weak";

export type GreenMetricCategory = {
  code: GreenMetricCategoryCode;
  label: string;
  description: string;
  score: number;
  max: number;
  percentage: number;
  status: GreenMetricCategoryStatus;
};

export type GreenMetricSummary = {
  worldRank: number;
  nationalRank: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  year: number;
  categories: GreenMetricCategory[];
  weakCategories: GreenMetricCategoryCode[];
  source: "uigreenmetric.com";
  period: "2025";
};

export type InstitutionListItem = {
  id: string;
  code: string;
  name_fr: string;
  name_ar?: string;
  acronym: string;
  governorate: string;
  submissionStatus: SubmissionStatus;
  submittedAt: string | null;
  lastAction: string;
};

export type Institution = {
  id: string;
  code: string;
  name_fr: string;
  name_ar?: string;
  acronym: string;
  governorate: string;
  type?: string;
};

export type InstitutionSubmission = {
  status: SubmissionStatus;
  period: string;
};

export type AuditTrailEntry = {
  id: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
};

export type InstitutionKpi = {
  domain: Domain | string;
  metric: string;
  value: number;
  period: string;
};

export type InstitutionDetail = {
  institution: Institution;
  submission: InstitutionSubmission;
  auditTrail: AuditTrailEntry[];
  kpis: InstitutionKpi[];
};

export type MonitorAuditEntry = {
  id: string;
  institutionId: string;
  institutionAcronym: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
};

export type CyclePerInstitutionResult = {
  institutionId: string;
  institutionAcronym: string;
  institutionName: string;
  governorate: string;
  previousState: string | null;
  newState: string | null;
  actionLabel: string;
  actionTaken: boolean;
  notes: string;
};

export type MonitorResponse = {
  checked: number;
  missingFound: number;
  actionsCreated: number;
  newAuditEntries: MonitorAuditEntry[];
  summary: string;
  cycleId: string;
  startedAt: string;
  finishedAt: string;
  newAlertsCount: number;
  conformInstitutionsCount: number;
  perInstitutionResults: CyclePerInstitutionResult[];
};

export type SubmitKpiInput = {
  domain: Domain | string;
  metric: string;
  value: number;
};

export type SubmitPayload = {
  institutionId: string;
  period: string;
  kpis: SubmitKpiInput[];
};

export type ValidationIssue = {
  metric?: string;
  message: string;
  severity?: AlertSeverity | string;
};

export type SubmitAlert = {
  metric: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string;
};

export type SubmitResponse = {
  success: boolean;
  submissionId: string;
  validations: {
    valid: boolean;
    issues: ValidationIssue[];
  };
  anomaliesDetected: number;
  newAlerts: SubmitAlert[];
};

export type Alert = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionAcronym: string;
  metric: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string;
  createdAt: string;
  resolved: boolean;
};

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  targetAcronym: string;
  details: string;
  createdAt: string;
};

export type KpiRecord = {
  institutionId: string;
  institutionAcronym: string;
  institutionName: string;
  metric: string;
  value: number;
  period: string;
  source?: string | null;
};

export type Prediction = {
  id: string;
  institutionAcronym: string;
  institutionName: string;
  metric: string;
  currentValue: number;
  trend: TrendDirection;
  trendData: number[];
  trendYears: string[];
  predictedValue: number;
  predictedPeriod: string;
  confidence: number;
  message: string;
};

export type ReportPayload = {
  institutionId: string | null;
  period: string;
  type: ReportType;
};
