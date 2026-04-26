import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { actionLabel, handleApiError, readJsonBody } from "@/lib/server-api";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { AuditLogRow, InstitutionRow, SubmissionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type MonitorRequest = {
  period?: string;
};

function nextActionFor(entries: AuditLogRow[]) {
  const actions = new Set(entries.map((entry) => entry.action));

  if (entries.length === 0) {
    return {
      action: "request_sent",
      details: "Demande de soumission envoyée",
    };
  }

  if (actions.has("request_sent") && !actions.has("reminder_sent")) {
    return {
      action: "reminder_sent",
      details: "Rappel envoyé - aucune réponse depuis 24h",
    };
  }

  if (actions.has("reminder_sent") && !actions.has("escalation_pending")) {
    return {
      action: "escalation_pending",
      details: "Escalade en cours - aucune réponse après 48h",
    };
  }

  return null;
}

function demoMonitorResponse(period: string) {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date().toISOString();
  const cycleId = randomUUID();
  const demoInstitutions = [
    {
      institutionId: "demo-enib",
      institutionAcronym: "ENIB",
      institutionName: "Ecole Nationale d'Ingenieurs de Bizerte",
      governorate: "Bizerte",
      action: "request_sent",
      actionLabel: "Demande envoyée",
      notes: `Demande de soumission envoyée - période ${period}`,
    },
    {
      institutionId: "demo-isg",
      institutionAcronym: "ISG",
      institutionName: "Institut Supérieur de Gestion de Tunis",
      governorate: "Tunis",
      action: "reminder_sent",
      actionLabel: "Rappel envoyé",
      notes: `Rappel envoyé - aucune réponse depuis 24h - période ${period}`,
    },
    {
      institutionId: "demo-fst",
      institutionAcronym: "FST",
      institutionName: "Faculté des Sciences de Tunis",
      governorate: "Tunis",
      action: "escalation_pending",
      actionLabel: "Escalade en cours",
      notes: `Escalade en cours - aucune réponse après 48h - période ${period}`,
    },
  ];

  return NextResponse.json({
    checked: 33,
    missingFound: demoInstitutions.length,
    actionsCreated: demoInstitutions.length,
    newAuditEntries: demoInstitutions.map((institution) => ({
      id: randomUUID(),
      institutionId: institution.institutionId,
      institutionAcronym: institution.institutionAcronym,
      action: institution.action,
      actor: "Tanit Coordination Agent",
      details: institution.notes,
      createdAt: finishedAt,
    })),
    summary: `${demoInstitutions.length} établissements manquants détectés. ${demoInstitutions.length} actions de coordination créées en mode démo.`,
    cycleId,
    startedAt,
    finishedAt,
    newAlertsCount: 1,
    conformInstitutionsCount: 30,
    perInstitutionResults: demoInstitutions.map((institution) => ({
      institutionId: institution.institutionId,
      institutionAcronym: institution.institutionAcronym,
      institutionName: institution.institutionName,
      governorate: institution.governorate,
      previousState: null,
      newState: institution.actionLabel,
      actionLabel: institution.actionLabel,
      actionTaken: true,
      notes: institution.notes,
    })),
    demoMode: true,
  });
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<MonitorRequest>(request);
    const period = body.period || "2024-2025";
    if (missingSupabaseEnv(true).length > 0) {
      return demoMonitorResponse(period);
    }

    const supabase = getSupabaseAdmin();
    const startedAt = new Date().toISOString();
    const cycleId = randomUUID();

    const [{ data: institutions, error: institutionsError }, submissionsResult] =
      await Promise.all([
        supabase
          .from("institutions")
          .select("id, code, name_fr, acronym, governorate")
          .neq("code", "400")
          .order("acronym", { ascending: true }),
        supabase
          .from("submissions")
          .select("institution_id, period, status")
          .eq("period", period)
          .eq("status", "validated"),
      ]);

    if (institutionsError) {
      throw institutionsError;
    }
    if (submissionsResult.error) {
      throw submissionsResult.error;
    }

    const institutionRows = (institutions ?? []) as InstitutionRow[];
    const submittedIds = new Set(
      ((submissionsResult.data ?? []) as SubmissionRow[]).map(
        (submission) => submission.institution_id,
      ),
    );
    const missing = institutionRows.filter(
      (institution) => !submittedIds.has(institution.id),
    );
    const missingIds = missing.map((institution) => institution.id);

    const auditResult = missingIds.length
      ? await supabase
          .from("audit_log")
          .select("id, actor, action, target, details, created_at")
          .in("target", missingIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (auditResult.error) {
      throw auditResult.error;
    }

    const auditsByTarget = new Map<string, AuditLogRow[]>();
    for (const entry of (auditResult.data ?? []) as AuditLogRow[]) {
      if (!entry.target) {
        continue;
      }

      const entries = auditsByTarget.get(entry.target) ?? [];
      entries.push(entry);
      auditsByTarget.set(entry.target, entries);
    }

    const createdAt = new Date().toISOString();
    const rowsToInsert = missing
      .map((institution) => {
        const next = nextActionFor(auditsByTarget.get(institution.id) ?? []);
        if (!next) {
          return null;
        }

        return {
          actor: "Tanit Coordination Agent",
          action: next.action,
          target: institution.id,
          details: `${next.details} - période ${period}`,
          created_at: createdAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const insertedResult = rowsToInsert.length
      ? await supabase
          .from("audit_log")
          .insert(rowsToInsert)
          .select("id, actor, action, target, details, created_at")
      : { data: [], error: null };

    if (insertedResult.error) {
      throw insertedResult.error;
    }

    const insertedRows = (insertedResult.data ?? []) as AuditLogRow[];
    const escalatedIds = insertedRows
      .filter((entry) => entry.action === "escalation_pending" && entry.target)
      .map((entry) => entry.target as string);

    let newAlertsCount = 0;

    if (escalatedIds.length) {
      const existingAlertsResult = await supabase
        .from("alerts")
        .select("institution_id")
        .in("institution_id", escalatedIds)
        .eq("metric", "submission_absence")
        .eq("resolved", false);

      if (existingAlertsResult.error) {
        throw existingAlertsResult.error;
      }

      const alreadyAlerted = new Set(
        (existingAlertsResult.data ?? []).map((alert) => alert.institution_id),
      );
      const alertsToInsert = escalatedIds
        .filter((institutionId) => !alreadyAlerted.has(institutionId))
        .map((institutionId) => ({
          institution_id: institutionId,
          metric: "submission_absence",
          severity: "critical",
          value: null,
          threshold: null,
          message: `Escalade en cours - aucune soumission pour la période ${period}`,
          resolved: false,
        }));

      if (alertsToInsert.length) {
        const { error: alertError } = await supabase
          .from("alerts")
          .insert(alertsToInsert);
        if (alertError) {
          throw alertError;
        }
        newAlertsCount = alertsToInsert.length;
      }
    }

    const institutionById = new Map(
      missing.map((institution) => [institution.id, institution]),
    );
    const newAuditEntries = insertedRows.map((entry) => {
      const institution = entry.target
        ? institutionById.get(entry.target)
        : undefined;

      return {
        id: entry.id,
        institutionId: entry.target,
        institutionAcronym: institution?.acronym ?? null,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
        createdAt: entry.created_at,
      };
    });

    const newEntryByInstitution = new Map(
      insertedRows
        .filter((entry) => entry.target)
        .map((entry) => [entry.target as string, entry]),
    );

    const perInstitutionResults = missing.map((institution) => {
      const previousEntries = auditsByTarget.get(institution.id) ?? [];
      const previousAction =
        previousEntries.length > 0
          ? previousEntries[previousEntries.length - 1].action
          : null;
      const newEntry = newEntryByInstitution.get(institution.id) ?? null;
      const actionTaken = Boolean(newEntry);
      const newAction = newEntry?.action ?? previousAction;

      return {
        institutionId: institution.id,
        institutionAcronym: institution.acronym,
        institutionName: institution.name_fr,
        governorate: institution.governorate ?? "",
        previousState: previousAction ? actionLabel(previousAction) : null,
        newState: newAction ? actionLabel(newAction) : null,
        actionLabel: newEntry
          ? actionLabel(newEntry.action)
          : "Système à jour",
        actionTaken,
        notes: newEntry
          ? newEntry.details ?? ""
          : "Système à jour, déjà escaladé",
      };
    });

    const finishedAt = new Date().toISOString();
    const conformInstitutionsCount = institutionRows.length - missing.length;

    return NextResponse.json({
      checked: institutionRows.length,
      missingFound: missing.length,
      actionsCreated: newAuditEntries.length,
      newAuditEntries,
      summary: `${missing.length} établissements manquants détectés. ${newAuditEntries.length} actions de coordination créées.`,
      cycleId,
      startedAt,
      finishedAt,
      newAlertsCount,
      conformInstitutionsCount,
      perInstitutionResults,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
