process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hmtcfzsmuolhebsfxvyf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtdGNmenNtdW9saGVic2Z4dnlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEyOTU5NSwiZXhwIjoyMDkyNzA1NTk1fQ._UHBJuq0n82b-C3Hj6nVfI6SAZ8bYmDQdhG5V34R7OE"
);

const CKAN_BASE = "https://catalog.data.gov.tn/api/3/action";
const UCAR_CODE = 4;
const DEMO_PERIOD = "2024-2025";
const MISSING_CODES = ["431", "407", "404"];

const RESOURCES = {
  institutions: "b1ca9192-0eda-4d63-94d9-cb7f7245d420",
  enrollment: "5be1d2b5-70a2-4acb-b44c-54b2c9b70fa1",
  faculty: "0317de6a-c179-438e-80f4-347634cb7957",
  graduates: "10ec88bf-5ea9-43ff-8c9b-b5fc84448ef9",
} as const;

type InstitutionRecord = {
  etablissement_code: number;
  university_code: number;
  label_ar?: string | null;
  label_fr?: string | null;
  website?: string | null;
  gouvernorat?: string | null;
  type?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
};

type EnrollmentRecord = {
  code_universite: number;
  code_etablissement: number;
  inscrits_f?: number | string | null;
  inscrits_m?: number | string | null;
  annee?: number | string | null;
};

type FacultyRecord = {
  code_universite: number;
  code_etablissement: number;
  cadres_f?: number | string | null;
  cadres_m?: number | string | null;
  annee?: number | string | null;
};

type GraduateRecord = {
  universite_code: number;
  etablissement_code: number;
  diplomes_total?: number | string | null;
};

async function ckanQuery<T>(
  resourceId: string,
  filters: Record<string, number>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(`${CKAN_BASE}/datastore_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: resourceId, limit: 1000, offset, filters }),
    });

    if (!res.ok) {
      throw new Error(`CKAN request failed for ${resourceId}: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const records = json.result?.records as T[] | undefined;

    if (!json.success || !records?.length) {
      break;
    }

    all.push(...records);

    if (records.length < 1000) {
      break;
    }

    offset += 1000;
  }

  return all;
}

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractAcronym(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (match) {
    return match[1];
  }

  return name
    .split(" ")
    .filter((word) => word.length > 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

async function requireTable(table: string) {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase table "${table}" is not ready. Run the Phase 1 schema SQL in the Supabase Dashboard first.\n${error.message}`
    );
  }
}

function accumulateByKey(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) || 0) + value);
}

async function main() {
  console.log("=== Project Tanit - Seeder ===\n");

  await requireTable("institutions");
  await requireTable("kpis");
  await requireTable("submissions");
  await requireTable("alerts");
  await requireTable("audit_log");

  console.log("[1/4] Fetching UCAR institutions from data.gov.tn...");
  const rawInstitutions = await ckanQuery<InstitutionRecord>(RESOURCES.institutions, {
    university_code: UCAR_CODE,
  });
  if (rawInstitutions.length === 0) {
    throw new Error("data.gov.tn returned 0 UCAR institutions. Stop and check the source before continuing.");
  }
  console.log(`  -> ${rawInstitutions.length} institutions found`);

  console.log("[2/4] Fetching enrollment data...");
  const enrollment = await ckanQuery<EnrollmentRecord>(RESOURCES.enrollment, {
    code_universite: UCAR_CODE,
  });
  if (enrollment.length === 0) {
    throw new Error("data.gov.tn returned 0 UCAR enrollment rows. Stop and check the source before continuing.");
  }
  console.log(`  -> ${enrollment.length} enrollment records`);

  console.log("[3/4] Fetching faculty data...");
  const faculty = await ckanQuery<FacultyRecord>(RESOURCES.faculty, {
    code_universite: UCAR_CODE,
  });
  if (faculty.length === 0) {
    throw new Error("data.gov.tn returned 0 UCAR faculty rows. Stop and check the source before continuing.");
  }
  console.log(`  -> ${faculty.length} faculty records`);

  console.log("[4/4] Fetching graduates data...");
  const graduates = await ckanQuery<GraduateRecord>(RESOURCES.graduates, {
    universite_code: UCAR_CODE,
  });
  if (graduates.length === 0) {
    throw new Error("data.gov.tn returned 0 UCAR graduate rows. Stop and check the source before continuing.");
  }
  console.log(`  -> ${graduates.length} graduate records`);

  console.log("\n[Seeding] Inserting institutions...");
  const institutionRows = rawInstitutions.map((record) => ({
    code: String(record.etablissement_code),
    name_fr: record.label_fr || `Institution ${record.etablissement_code}`,
    name_ar: record.label_ar || null,
    acronym: extractAcronym(record.label_fr || ""),
    governorate: record.gouvernorat || null,
    lat: record.lat == null ? null : Number(record.lat),
    lon: record.lon == null ? null : Number(record.lon),
    type: record.type || null,
    website: record.website || null,
  }));

  const { error: institutionError } = await supabase
    .from("institutions")
    .upsert(institutionRows, { onConflict: "code" });

  if (institutionError) {
    throw institutionError;
  }
  console.log(`  -> ${institutionRows.length} institutions inserted`);

  const { data: dbInstitutions, error: dbInstitutionError } = await supabase
    .from("institutions")
    .select("id, code, name_fr");

  if (dbInstitutionError) {
    throw dbInstitutionError;
  }

  const codeToId = new Map<string, string>();
  for (const institution of dbInstitutions ?? []) {
    codeToId.set(institution.code, institution.id);
  }

  console.log("[Seeding] Resetting prior demo rows...");
  await supabase.from("kpis").delete().eq("source", "data.gov.tn");
  await supabase.from("submissions").delete().eq("period", DEMO_PERIOD);
  await supabase.from("alerts").delete().eq("metric", "taux_reussite");
  await supabase.from("audit_log").delete().eq("actor", "Tanit Coordination Agent");

  console.log("[Seeding] Building KPI records...");
  const kpiRows: Array<{
    institution_id: string;
    domain: string;
    metric: string;
    value: number;
    period: string;
    source: string;
  }> = [];

  const enrollmentTotals = new Map<string, number>();
  const femaleEnrollmentTotals = new Map<string, number>();
  for (const record of enrollment) {
    const code = String(record.code_etablissement);
    if (!codeToId.has(code)) {
      continue;
    }

    const year = String(record.annee || "2023");
    const key = `${code}:${year}`;
    accumulateByKey(enrollmentTotals, key, num(record.inscrits_f) + num(record.inscrits_m));
    accumulateByKey(femaleEnrollmentTotals, key, num(record.inscrits_f));
  }

  for (const [key, total] of enrollmentTotals) {
    if (total <= 0) {
      continue;
    }

    const [code, year] = key.split(":");
    const institutionId = codeToId.get(code);
    if (!institutionId) {
      continue;
    }

    kpiRows.push({
      institution_id: institutionId,
      domain: "academic",
      metric: "effectif_etudiants",
      value: total,
      period: year,
      source: "data.gov.tn",
    });
    kpiRows.push({
      institution_id: institutionId,
      domain: "esg",
      metric: "etudiantes_f",
      value: femaleEnrollmentTotals.get(key) || 0,
      period: year,
      source: "data.gov.tn",
    });
  }

  const facultyTotals = new Map<string, number>();
  for (const record of faculty) {
    const code = String(record.code_etablissement);
    if (!codeToId.has(code)) {
      continue;
    }

    const year = String(record.annee || "2023");
    const key = `${code}:${year}`;
    accumulateByKey(facultyTotals, key, num(record.cadres_m) + num(record.cadres_f));
  }

  for (const [key, total] of facultyTotals) {
    if (total <= 0) {
      continue;
    }

    const [code, year] = key.split(":");
    const institutionId = codeToId.get(code);
    if (!institutionId) {
      continue;
    }

    kpiRows.push({
      institution_id: institutionId,
      domain: "hr",
      metric: "effectif_enseignants",
      value: total,
      period: year,
      source: "data.gov.tn",
    });
  }

  const graduateTotals = new Map<string, number>();
  for (const record of graduates) {
    const code = String(record.etablissement_code);
    graduateTotals.set(code, (graduateTotals.get(code) || 0) + num(record.diplomes_total));
  }

  for (const [code, total] of graduateTotals) {
    const institutionId = codeToId.get(code);
    if (!institutionId || total === 0) {
      continue;
    }

    kpiRows.push({
      institution_id: institutionId,
      domain: "academic",
      metric: "diplomes",
      value: total,
      period: "2021-2022",
      source: "data.gov.tn",
    });
  }

  const enroll2023 = new Map<string, number>();
  for (const record of enrollment) {
    if (String(record.annee) !== "2023") {
      continue;
    }

    const code = String(record.code_etablissement);
    enroll2023.set(code, (enroll2023.get(code) || 0) + num(record.inscrits_m) + num(record.inscrits_f));
  }

  for (const [code, graduatesTotal] of graduateTotals) {
    const enrolled = enroll2023.get(code) || 0;
    const institutionId = codeToId.get(code);

    if (!institutionId || enrolled === 0) {
      continue;
    }

    const rate = Math.round((graduatesTotal / enrolled) * 10000) / 100;
    kpiRows.push({
      institution_id: institutionId,
      domain: "academic",
      metric: "taux_reussite",
      value: rate,
      period: "2021-2023",
      source: "data.gov.tn",
    });
  }

  for (let index = 0; index < kpiRows.length; index += 500) {
    const batch = kpiRows.slice(index, index + 500);
    const { error } = await supabase.from("kpis").insert(batch);
    if (error) {
      throw error;
    }
  }
  console.log(`  -> ${kpiRows.length} KPI records inserted`);

  console.log("[Seeding] Setting up submission status for demo...");
  const allInstitutions = dbInstitutions ?? [];
  const submitted = allInstitutions.filter((institution) => !MISSING_CODES.includes(institution.code));
  const missing = allInstitutions.filter((institution) => MISSING_CODES.includes(institution.code));

  const submissionRows = submitted.map((institution) => ({
    institution_id: institution.id,
    period: DEMO_PERIOD,
    status: "validated",
    submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { error: submissionError } = await supabase.from("submissions").insert(submissionRows);
  if (submissionError) {
    throw new Error(
      `Submission insert failed. Make sure the submissions unique constraint exists before rerunning.\n${submissionError.message}`
    );
  }
  console.log(`  -> ${submitted.length} institutions marked as submitted`);
  console.log(`  -> ${missing.length} institutions left missing (ENIB, INSAT, IHEC)`);

  const { data: lowestRate, error: lowestRateError } = await supabase
    .from("kpis")
    .select("institution_id, value")
    .eq("metric", "taux_reussite")
    .order("value", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lowestRateError) {
    throw lowestRateError;
  }

  if (lowestRate) {
    const { error: alertError } = await supabase.from("alerts").insert({
      institution_id: lowestRate.institution_id,
      metric: "taux_reussite",
      severity: "critical",
      value: lowestRate.value,
      threshold: 30,
      message: `Taux de reussite critique: ${lowestRate.value}% (seuil: 30%). Intervention recommandee.`,
      resolved: false,
    });

    if (alertError) {
      throw alertError;
    }

    console.log(`  -> Anomaly alert seeded for institution with taux_reussite = ${lowestRate.value}%`);
  }

  for (const institution of missing) {
    const { error } = await supabase.from("audit_log").insert({
      actor: "Tanit Coordination Agent",
      action: "reminder_sent",
      target: institution.id,
      details: `Rappel automatique envoye - aucune soumission pour la periode ${DEMO_PERIOD}. Escalade dans 48h si pas de reponse.`,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      throw error;
    }
  }
  console.log("  -> Coordination reminders logged in audit trail (sent 24h ago)");

  const counts = await Promise.all([
    supabase.from("institutions").select("*", { head: true, count: "exact" }),
    supabase.from("kpis").select("*", { head: true, count: "exact" }),
    supabase.from("submissions").select("*", { head: true, count: "exact" }),
    supabase.from("alerts").select("*", { head: true, count: "exact" }),
    supabase.from("audit_log").select("*", { head: true, count: "exact" }),
  ]);

  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`Institutions: ${counts[0].count ?? 0}`);
  console.log(`KPIs: ${counts[1].count ?? 0}`);
  console.log(`Submissions: ${counts[2].count ?? 0}`);
  console.log(`Alerts: ${counts[3].count ?? 0}`);
  console.log(`Audit log: ${counts[4].count ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
