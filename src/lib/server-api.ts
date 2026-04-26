import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message, status }, { status });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function handleApiError(error: unknown) {
  if (isApiError(error)) {
    return jsonError(error.message, error.status);
  }

  const message =
    error instanceof Error ? error.message : "Erreur interne du serveur";
  return jsonError(message, 500);
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Corps JSON invalide", 400);
  }
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`Champ requis invalide: ${field}`, 400);
  }

  return value.trim();
}

export function optionalPeriod(url: URL, fallback = "2024-2025") {
  return url.searchParams.get("period") || fallback;
}

export function parseLimit(url: URL, fallback = 50, max = 200) {
  const raw = url.searchParams.get("limit");
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError("Parametre limit invalide", 400);
  }

  return Math.min(parsed, max);
}

export function formatRelativeFr(dateValue: string | null | undefined) {
  if (!dateValue) {
    return "Aucune action";
  }

  const timestamp = new Date(dateValue).getTime();
  const now = Date.now();
  const deltaMs = Math.max(0, now - timestamp);
  const minutes = Math.max(1, Math.round(deltaMs / 60000));

  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
}

export function actionLabel(action: string | null | undefined) {
  switch (action) {
    case "request_sent":
      return "Demande envoyée";
    case "reminder_sent":
      return "Rappel envoyé";
    case "escalation_pending":
      return "Escalade en cours";
    case "absence_detected":
      return "Absence détectée";
    case "submission_validated":
      return "Soumission validée";
    default:
      return action || "Action";
  }
}

export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
