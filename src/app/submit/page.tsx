"use client";

import { AlertTriangle, Check, Radar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getInstitutions, submitKpis } from "@/lib/api";
import { Field } from "@/components/field";
import { TanitCard } from "@/components/tanit-card";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import { Topbar } from "@/components/topbar";
import type {
  Domain,
  InstitutionListItem,
  SubmitKpiInput,
  SubmitResponse,
} from "@/types/api";

const PERIOD = "2024-2025";

type FieldKey = "success" | "students" | "teachers" | "graduates";

type FormValues = Record<FieldKey, string>;

type KpiField = {
  key: FieldKey;
  label: string;
  help: string;
  max?: number;
};

const emptyValues: FormValues = {
  success: "",
  students: "",
  teachers: "",
  graduates: "",
};

function metricForField(key: FieldKey) {
  const metrics: Record<FieldKey, string> = {
    success: "taux_reussite",
    students: "effectif_etudiants",
    teachers: "effectif_enseignants",
    graduates: "diplomes",
  };

  return metrics[key];
}

export default function SubmitPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([]);
  const [inst, setInst] = useState("");
  const [period, setPeriod] = useState(PERIOD);
  const [domain, setDomain] = useState<Domain>("academic");
  const [vals, setVals] = useState<FormValues>(emptyValues);
  const [phase, setPhase] = useState<"idle" | "validating" | "success">(
    "idle",
  );
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<TanitToastValue>(null);

  const loadInstitutions = useCallback(async () => {
    setError(null);
    try {
      const data = await getInstitutions(period);
      setInstitutions(data);
      setInst((current) => current || data[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [period]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInstitutions();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadInstitutions]);

  useEffect(() => {
    if (phase !== "success") return;

    const timeout = window.setTimeout(() => router.push("/dashboard"), 1800);
    return () => window.clearTimeout(timeout);
  }, [phase, router]);

  const fields = useMemo<KpiField[]>(
    () =>
      domain === "academic"
        ? [
            {
              key: "success" as const,
              label: "Taux de réussite (%)",
              help: "Pourcentage de réussite aux examens",
              max: 100,
            },
            {
              key: "students" as const,
              label: "Effectif étudiants",
              help: "Nombre total d'inscrits 2024-2025",
            },
            {
              key: "graduates" as const,
              label: "Diplômés",
              help: "Diplômés sur l'année écoulée",
            },
          ]
        : [
            {
              key: "teachers" as const,
              label: "Effectif enseignants",
              help: "Permanents et contractuels",
            },
            {
              key: "students" as const,
              label: "Effectif étudiants",
              help: "Pour calcul du ratio",
            },
          ],
    [domain],
  );

  async function submit() {
    if (!inst || phase === "validating") return;

    const kpis: SubmitKpiInput[] = fields
      .map((field) => ({
        domain,
        metric: metricForField(field.key),
        value: Number(vals[field.key]),
      }))
      .filter((kpi) => Number.isFinite(kpi.value) && valsFromMetric(kpi.metric));

    if (!kpis.length) {
      setError("Erreur de chargement");
      return;
    }

    setPhase("validating");
    setError(null);

    try {
      const response = await submitKpis({
        institutionId: inst,
        period,
        kpis,
      });
      setResult(response);
      setPhase("success");
      const selected = institutions.find((institution) => institution.id === inst);
      setToast({
        title: "Soumission validée",
        body: `KPIs ${period} enregistrés pour ${selected?.acronym ?? "UCAR"}.`,
      });
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }

  function valsFromMetric(metric: string) {
    const entry = fields.find((field) => metricForField(field.key) === metric);
    return entry ? vals[entry.key] !== "" : false;
  }

  return (
    <div className="px-10 pt-8 pb-16 max-w-[760px] mx-auto">
      <Topbar
        eyebrow="Université de Carthage · Soumission KPIs"
        title="Soumettre des indicateurs"
        subtitle="Soumission trimestrielle des KPIs pour la période en cours"
      />

      {error ? (
        <button
          onClick={loadInstitutions}
          className="mb-6 h-10 px-4 rounded-md border border-red-500/30 bg-red-500/10 text-[13px] text-red-600"
        >
          Erreur de chargement · Réessayer
        </button>
      ) : null}

      <TanitCard className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Établissement">
            <select
              value={inst}
              onChange={(event) => setInst(event.target.value)}
              className="w-full h-10 px-3 rounded-md bg-white border border-zinc-200 text-[13px] text-zinc-900 focus:border-zinc-600 outline-none"
            >
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.acronym} — {institution.name_fr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Période">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="w-full h-10 px-3 rounded-md bg-white border border-zinc-200 text-[13px] text-zinc-900 focus:border-zinc-600 outline-none"
            >
              <option>2024-2025</option>
              <option>2023-2024</option>
              <option>2022-2023</option>
            </select>
          </Field>
        </div>

        <Field label="Domaine">
          <div className="grid grid-cols-5 gap-1.5">
            {[
              ["academic", "Académique"],
              ["finance", "Finances"],
              ["hr", "RH"],
              ["research", "Recherche"],
              ["esg", "ESG"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDomain(key as Domain)}
                className={`h-9 rounded-md text-[12.5px] font-medium transition ${
                  domain === key
                    ? "bg-blue-500/10 border border-blue-500/40 text-blue-600"
                    : "border border-zinc-200 text-zinc-600 hover:text-zinc-800 hover:border-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <div className="border-t border-zinc-100 pt-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-4">
            Indicateurs · {domain === "academic" ? "Académique" : "RH"}
          </div>
          <div className="space-y-4">
            {fields.map((field) => (
              <Field key={field.key} label={field.label} help={field.help}>
                <input
                  type="number"
                  value={vals[field.key]}
                  onChange={(event) =>
                    setVals((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  max={field.max}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-md bg-white border border-zinc-200 text-[13px] text-zinc-900 font-mono focus:border-zinc-600 outline-none"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <button
            onClick={submit}
            disabled={phase === "validating"}
            className="w-full h-12 rounded-md text-white font-medium text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              background:
                "linear-gradient(180deg,#3b82f6 0%, #297CE9 50%, #1B487E 100%)",
            }}
          >
            {phase === "validating" ? (
              <>
                <span className="radar-sweep inline-block">
                  <Radar size={15} />
                </span>{" "}
                Tanit valide la soumission…
              </>
            ) : (
              <>
                <Check size={16} /> Soumettre les KPIs
              </>
            )}
          </button>
          <div className="text-[11px] text-zinc-400 text-center mt-2">
            Tanit valide les seuils, détecte les anomalies, et génère un audit
            immutable.
          </div>
        </div>
      </TanitCard>

      {phase === "success" && result ? (
        <div className="mt-6 space-y-3 fade-in">
          <div className="flex items-start gap-3 bg-emerald-500/[0.06] border border-emerald-500/30 rounded-lg p-4">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 grid place-items-center text-emerald-600 shrink-0">
              <Check size={15} />
            </div>
            <div>
              <div className="text-[13px] font-medium text-emerald-600">
                Soumission validée · {fields.length} KPIs enregistrés
              </div>
              <div className="text-[12px] text-zinc-600 mt-0.5">
                Audit Tanit : entrée signée · ID #{result.submissionId}
              </div>
            </div>
          </div>
          {result.validations.issues.map((issue, index) => (
            <div
              key={`${issue.message}-${index}`}
              className="flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg p-4"
            >
              <div className="w-8 h-8 rounded-md bg-amber-500/15 grid place-items-center text-amber-600 shrink-0">
                <AlertTriangle size={15} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-amber-600">
                  Validation Tanit
                </div>
                <div className="text-[12px] text-zinc-700 mt-0.5">
                  {issue.message}
                </div>
              </div>
            </div>
          ))}
          {result.newAlerts.map((alert, index) => (
            <div
              key={`${alert.metric}-${index}`}
              className="flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg p-4"
            >
              <div className="w-8 h-8 rounded-md bg-amber-500/15 grid place-items-center text-amber-600 shrink-0">
                <AlertTriangle size={15} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-amber-600">
                  Tanit a détecté {result.anomaliesDetected} anomalie
                </div>
                <div className="text-[12px] text-zinc-700 mt-0.5">
                  <span className="font-mono">
                    {alert.metric} · {alert.value}%
                  </span>{" "}
                  — sous le seuil <span className="font-mono">{alert.threshold}%</span>.{" "}
                  {alert.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
