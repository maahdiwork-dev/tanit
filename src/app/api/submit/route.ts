import { NextResponse } from "next/server";

import {
  ApiError,
  handleApiError,
  readJsonBody,
  requiredString,
} from "@/lib/server-api";
import { demoSubmitResponse } from "@/lib/demo-api-fallbacks";
import { callIngestionWorkflow } from "@/lib/mastra";
import type { SubmitRequest, SubmitResponse, SubmittedKpi } from "@/lib/types";

export const dynamic = "force-dynamic";

function validateKpis(value: unknown): SubmittedKpi[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError("Champ requis invalide: kpis", 400);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ApiError(`KPI ${index + 1} invalide`, 400);
    }

    const record = item as Record<string, unknown>;
    const domain = requiredString(record.domain, `kpis[${index}].domain`);
    const metric = requiredString(record.metric, `kpis[${index}].metric`);
    const valueNumber = Number(record.value);

    if (!Number.isFinite(valueNumber)) {
      throw new ApiError(`KPI ${index + 1}: valeur invalide`, 400);
    }

    return {
      domain,
      metric,
      value: valueNumber,
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getNested(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) {
      return null;
    }

    current = record[key];
  }

  return current;
}

function isSubmitResponse(value: unknown): value is SubmitResponse {
  const record = asRecord(value);
  return (
    !!record &&
    typeof record.success === "boolean" &&
    (typeof record.submissionId === "string" || record.submissionId === null) &&
    !!asRecord(record.validations) &&
    typeof asRecord(record.validations)?.valid === "boolean" &&
    Array.isArray(asRecord(record.validations)?.issues) &&
    typeof record.anomaliesDetected === "number" &&
    Array.isArray(record.newAlerts)
  );
}

function unwrapSubmitResponse(mastraResponse: unknown): SubmitResponse {
  const candidates = [
    mastraResponse,
    getNested(mastraResponse, ["result"]),
    getNested(mastraResponse, ["output"]),
    getNested(mastraResponse, ["steps", "detect_anomalies", "output"]),
    getNested(mastraResponse, ["steps", "detect_anomalies", "result"]),
    getNested(mastraResponse, ["results", "detect_anomalies", "output"]),
    getNested(mastraResponse, ["results", "detect_anomalies", "result"]),
  ];

  const output = candidates.find(isSubmitResponse);
  if (!output) {
    throw new ApiError("Réponse Mastra ingestion invalide", 502);
  }

  return output;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<Partial<SubmitRequest>>(request);
    const payload: SubmitRequest = {
      institutionId: requiredString(body.institutionId, "institutionId"),
      period: requiredString(body.period, "period"),
      kpis: validateKpis(body.kpis),
    };

    if (!process.env.MASTRA_URL && !process.env.MASTRA_API_URL) {
      return NextResponse.json(demoSubmitResponse());
    }

    const result = await callIngestionWorkflow(payload);
    return NextResponse.json(unwrapSubmitResponse(result));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED"))
    ) {
      return NextResponse.json(demoSubmitResponse());
    }

    if (error instanceof Error && !("status" in error)) {
      return handleApiError(new ApiError(error.message, 502));
    }

    return handleApiError(error);
  }
}
