"use client";

import { Download, FileText, Radar } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { generateReport, getInstitutions } from "@/lib/api";
import { Field } from "@/components/field";
import { TanitCard } from "@/components/tanit-card";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import { Topbar } from "@/components/topbar";
import type { InstitutionListItem, ReportType } from "@/types/api";

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("PAP");
  const [period, setPeriod] = useState("2024-2025");
  const [target, setTarget] = useState("global");
  const [phase, setPhase] = useState<"idle" | "working">("idle");
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<TanitToastValue>(null);

  const loadInstitutions = useCallback(async () => {
    setError(null);
    try {
      setInstitutions(await getInstitutions("2024-2025"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInstitutions();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadInstitutions]);

  async function generate() {
    if (phase === "working") return;

    setPhase("working");
    setError(null);
    try {
      const report = await generateReport({
        institutionId: target === "global" ? null : target,
        period,
        type,
      });
      const href = window.URL.createObjectURL(report.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
      setToast({
        title: "Rapport généré",
        body: `Le rapport ${type} ${period} est prêt à être téléchargé.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="px-10 pt-8 pb-16 max-w-[1280px] mx-auto">
      <Topbar
        eyebrow="Documents officiels · RAP / PAP"
        title="Rapports automatiques"
        subtitle="Générer un rapport institutionnel pré-rempli en un clic"
      />
      {error ? (
        <button
          onClick={loadInstitutions}
          className="mb-6 h-10 px-4 rounded-md border border-red-500/30 bg-red-500/10 text-[13px] text-red-600"
        >
          Erreur de chargement · Réessayer
        </button>
      ) : null}
      <div className="grid grid-cols-5 gap-6">
        <TanitCard className="col-span-3">
          <div className="text-[14px] font-medium text-zinc-900 mb-1">
            Générer un nouveau rapport
          </div>
          <div className="text-[12px] text-zinc-500 mb-6">
            Tanit assemble le PDF à partir des KPIs validés et de l&apos;historique
            d&apos;audit.
          </div>

          <div className="space-y-5">
            <Field label="Type de rapport">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["RAP", "Rapport Annuel de Performance"],
                  ["PAP", "Projet Annuel de Performance"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setType(key as ReportType)}
                    className={`h-12 px-3 rounded-md text-left transition ${
                      type === key
                        ? "bg-blue-500/10 border border-blue-500/40"
                        : "border border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div
                      className={`text-[13px] font-mono font-semibold ${
                        type === key ? "text-blue-600" : "text-zinc-800"
                      }`}
                    >
                      {key}
                    </div>
                    <div className="text-[11px] text-zinc-500">{label}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Cible">
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="w-full h-10 px-3 rounded-md bg-white border border-zinc-200 text-[13px] text-zinc-900"
              >
                <option value="global">UCAR · Global (33 établissements)</option>
                {institutions.slice(0, 12).map((institution) => (
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
                className="w-full h-10 px-3 rounded-md bg-white border border-zinc-200 text-[13px] text-zinc-900"
              >
                <option>2024-2025</option>
                <option>2023-2024</option>
              </select>
            </Field>
            <button
              onClick={generate}
              disabled={phase === "working"}
              className="w-full h-12 rounded-md text-white font-medium text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
            >
              {phase === "working" ? (
                <>
                  <span className="radar-sweep inline-block">
                    <Radar size={15} />
                  </span>{" "}
                  Tanit assemble le rapport…
                </>
              ) : (
                <>
                  <Download size={16} /> Générer le rapport PDF
                </>
              )}
            </button>
          </div>
        </TanitCard>

        <TanitCard className="col-span-2" padded={false}>
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-zinc-100">
            <div className="text-[13px] font-medium text-zinc-900">
              Rapports récents
            </div>
          </div>
          <div className="px-6 py-12 grid place-items-center text-center">
            <div className="w-12 h-12 rounded-full border border-zinc-200 grid place-items-center text-zinc-300 mb-4">
              <FileText size={18} />
            </div>
            <div className="text-[13px] text-zinc-700 font-medium">
              Aucun rapport généré
            </div>
            <div className="text-[12px] text-zinc-500 mt-1.5 max-w-[260px] leading-relaxed">
              Tanit assemble votre premier rapport en un clic à partir des KPIs
              validés.
            </div>
          </div>
        </TanitCard>
      </div>
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
