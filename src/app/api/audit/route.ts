import { NextResponse } from "next/server";

import { handleApiError, parseLimit } from "@/lib/server-api";
import { demoAuditEntries } from "@/lib/demo-api-fallbacks";
import { getSupabaseAdmin, missingSupabaseEnv } from "@/lib/supabase";
import type { AuditLogRow, InstitutionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const institutionId = url.searchParams.get("institutionId");
    const limit = parseLimit(url);
    if (missingSupabaseEnv(true).length > 0) {
      return NextResponse.json(demoAuditEntries({ institutionId, limit }));
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("audit_log")
      .select("id, actor, action, target, details, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (institutionId) {
      query = query.eq("target", institutionId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const auditRows = (data ?? []) as AuditLogRow[];
    const targetIds = [
      ...new Set(
        auditRows
          .map((entry) => entry.target)
          .filter((target): target is string => Boolean(target)),
      ),
    ];

    const institutionsResult = targetIds.length
      ? await supabase
          .from("institutions")
          .select("id, acronym")
          .in("id", targetIds)
      : { data: [], error: null };

    if (institutionsResult.error) {
      throw institutionsResult.error;
    }

    const acronymById = new Map(
      ((institutionsResult.data ?? []) as InstitutionRow[]).map(
        (institution) => [institution.id, institution.acronym],
      ),
    );

    return NextResponse.json(
      auditRows.map((entry) => ({
        id: entry.id,
        actor: entry.actor,
        action: entry.action,
        target: entry.target,
        targetAcronym: entry.target ? acronymById.get(entry.target) ?? null : null,
        details: entry.details,
        createdAt: entry.created_at,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
