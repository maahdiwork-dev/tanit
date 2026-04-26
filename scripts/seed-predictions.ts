process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type PgClient = {
  connect: () => Promise<void>;
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
};

type PgClientConstructor = new (config: {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}) => PgClient;

type Institution = {
  id: string;
  name_fr: string;
  acronym: string | null;
};

type Kpi = {
  institution_id: string;
  period: string;
  value: number;
};

const CREATE_TABLE_SQL = `
create extension if not exists "uuid-ossp";

create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id),
  metric text not null,
  current_value double precision,
  trend_data jsonb,
  trend_years jsonb,
  predicted_value double precision,
  predicted_period text,
  confidence double precision,
  message text,
  created_at timestamptz default now()
);

create index if not exists idx_predictions_institution on predictions(institution_id);
create index if not exists idx_predictions_confidence on predictions(confidence);
`;

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function createPredictionsTable() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const importer = Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<{ Client: PgClientConstructor }>;
  const { Client } = await importer("pg");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(CREATE_TABLE_SQL);
  } finally {
    await client.end();
  }
}

function confidenceFor(values: number[]) {
  const dropRate = values[0] === 0 ? 0 : (values[0] - values[2]) / values[0];
  return Math.round(Math.min(0.9, Math.max(0.7, 0.7 + dropRate)) * 100) / 100;
}

function projection(values: number[]) {
  const slope = (values[2] - values[0]) / 2;
  return Math.max(0, Math.round(values[2] + slope));
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  await createPredictionsTable();

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const { data: institutions, error: institutionError } = await supabase
    .from("institutions")
    .select("id, name_fr, acronym")
    .order("acronym", { ascending: true });

  if (institutionError) {
    throw institutionError;
  }

  const institutionRows = (institutions ?? []) as Institution[];
  const { data: kpis, error: kpiError } = await supabase
    .from("kpis")
    .select("institution_id, period, value")
    .eq("metric", "effectif_etudiants")
    .in("period", ["2021", "2022", "2023"]);

  if (kpiError) {
    throw kpiError;
  }

  const byInstitution = new Map<string, Map<string, number>>();
  for (const kpi of (kpis ?? []) as Kpi[]) {
    const periods = byInstitution.get(kpi.institution_id) ?? new Map();
    periods.set(kpi.period, Number(kpi.value));
    byInstitution.set(kpi.institution_id, periods);
  }

  const rows = institutionRows.flatMap((institution) => {
    const periods = byInstitution.get(institution.id);
    const values = [
      periods?.get("2021"),
      periods?.get("2022"),
      periods?.get("2023"),
    ];

    if (values.some((value) => typeof value !== "number")) {
      return [];
    }

    const trend = values as number[];
    if (!(trend[0] > trend[1] && trend[1] > trend[2])) {
      return [];
    }

    return [
      {
        institution_id: institution.id,
        metric: "effectif_etudiants",
        current_value: trend[2],
        trend_data: trend,
        trend_years: ["2021", "2022", "2023"],
        predicted_value: projection(trend),
        predicted_period: "2024",
        confidence: confidenceFor(trend),
        message:
          "Tendance baissière détectée - risque de sous-effectif 2025",
      },
    ];
  });

  const { error: deleteError } = await supabase
    .from("predictions")
    .delete()
    .eq("metric", "effectif_etudiants")
    .eq("predicted_period", "2024");

  if (deleteError) {
    throw deleteError;
  }

  if (rows.length) {
    const { error: insertError } = await supabase
      .from("predictions")
      .insert(rows);

    if (insertError) {
      throw insertError;
    }
  }

  console.log(`Predictions seeded: ${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
