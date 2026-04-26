import type {
  Alert,
  AuditLogEntry,
  DashboardSummary,
  Domain,
  GreenMetricSummary,
  InstitutionDetail,
  InstitutionListItem,
  KpiRecord,
  MonitorResponse,
  Prediction,
  ReportPayload,
  SubmitPayload,
  SubmitResponse,
} from "@/types/api";

export type ResolveAlertResponse = {
  success: boolean;
  alertId: string;
  resolvedAt: string;
};

export type RemindResponse = {
  success: boolean;
  auditEntryId: string;
  sentAt: string;
};

async function parseError(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || "Erreur de chargement";
  } catch {
    return "Erreur de chargement";
  }
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json() as Promise<T>;
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  });

  return search.toString();
}

export function getDashboardSummary(period = "2024-2025") {
  return fetchJson<DashboardSummary>(
    `/api/dashboard/summary?${query({ period })}`,
  );
}

export function getInstitutions(period = "2024-2025") {
  return fetchJson<InstitutionListItem[]>(
    `/api/institutions?${query({ period })}`,
  );
}

export function getInstitutionDetail(id: string) {
  return fetchJson<InstitutionDetail>(
    `/api/institutions/${encodeURIComponent(id)}`,
  );
}

export function runMonitor(period = "2024-2025") {
  return fetchJson<MonitorResponse>("/api/monitor", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
}

export function getAlerts(resolved = false) {
  return fetchJson<Alert[]>(`/api/alerts?${query({ resolved })}`);
}

export function getAudit(options: { institutionId?: string; limit?: number } = {}) {
  return fetchJson<AuditLogEntry[]>(
    `/api/audit?${query({
      institutionId: options.institutionId,
      limit: options.limit ?? 50,
    })}`,
  );
}

export function getKpis(domain: Domain | string, period = "2023") {
  return fetchJson<KpiRecord[]>(`/api/kpis?${query({ domain, period })}`);
}

export function getPredictions() {
  return fetchJson<Prediction[]>("/api/predictions");
}

export function getGreenMetricSummary() {
  return fetchJson<GreenMetricSummary>("/api/greenmetric/summary");
}

export function submitKpis(payload: SubmitPayload) {
  return fetchJson<SubmitResponse>("/api/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function filenameFromContentDisposition(header: string | null) {
  if (!header) return null;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].replace(/["']/g, ""));

  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

export async function generateReport(payload: ReportPayload) {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return {
    blob: await res.blob(),
    filename:
      filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
      `${payload.type}-${payload.institutionId ?? "UCAR"}-${payload.period}.pdf`,
  };
}

export function generateGreenMetricStrategy() {
  return generateReport({
    institutionId: null,
    period: "2025",
    type: "greenmetric_strategy",
  });
}

export async function generateCycleReport(cycle: MonitorResponse) {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "cycle_report",
      cycleId: cycle.cycleId,
      cycle,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return {
    blob: await res.blob(),
    filename:
      filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
      `Rapport-Surveillance-UCAR-${cycle.cycleId}.pdf`,
  };
}

export function resolveAlert(alertId: string) {
  return fetchJson<ResolveAlertResponse>(
    `/api/alerts/${encodeURIComponent(alertId)}/resolve`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function sendManualReminder(institutionId: string) {
  return fetchJson<RemindResponse>(
    `/api/institutions/${encodeURIComponent(institutionId)}/remind`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function exportInstitutionsCsv() {
  const res = await fetch("/api/institutions/export");
  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return {
    blob: await res.blob(),
    filename:
      filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
      `UCAR-Etablissements-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
