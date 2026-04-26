export type InstitutionRow = {
  id: string;
  code: string;
  name_fr: string;
  name_ar: string | null;
  acronym: string | null;
  governorate: string | null;
  lat?: number | null;
  lon?: number | null;
  type: string | null;
  website?: string | null;
  created_at?: string;
};

export type SubmissionRow = {
  id: string;
  institution_id: string;
  period: string;
  status: string;
  submitted_at: string | null;
  domain?: string | null;
  created_at?: string;
};

export type KpiRow = {
  id?: string;
  institution_id: string;
  domain: string;
  metric: string;
  value: number;
  period: string;
  source?: string | null;
  created_at?: string;
};

export type AlertRow = {
  id: string;
  institution_id: string;
  metric: string;
  severity: string;
  message: string;
  value: number | null;
  threshold: number | null;
  resolved: boolean;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor: string | null;
  action: string;
  target: string | null;
  details: string | null;
  created_at: string;
};

export type SubmittedKpi = {
  domain: string;
  metric: string;
  value: number;
};

export type SubmitRequest = {
  institutionId: string;
  period: string;
  kpis: SubmittedKpi[];
};

export type SubmitResponse = {
  success: boolean;
  submissionId: string | null;
  validations: {
    valid: boolean;
    issues: string[];
  };
  anomaliesDetected: number;
  newAlerts: Array<{
    metric: string;
    severity: string;
    value: number;
    threshold: number;
    message: string;
  }>;
};
