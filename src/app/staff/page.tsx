"use client";

import {
  ArrowRight,
  Check,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import {
  getTickets,
  subscribeToStore,
  type TicketSummary,
} from "@/lib/demo-mocks";
import { useRoleContext } from "@/lib/role-context";
import { TanitCard } from "@/components/tanit-card";
import { TanitDock } from "@/components/tanit-dock";
import { TicketDetailSheet } from "@/components/ticket-detail-sheet";
import { fmtFR } from "@/components/tanit-constants";

const REQUIRED_KPIS_2024_2025 = [
  { id: "academic_2024", label: "Académique" },
  { id: "hr_2024", label: "Effectif RH" },
  { id: "finance_2024", label: "Finances" },
  { id: "research_2024", label: "Recherche" },
  { id: "infrastructure_2024", label: "Infrastructure" },
  { id: "insertion_2024", label: "Insertion pro." },
  { id: "esg_2024", label: "ESG" }, // the missing one
];

const QUICK_NAV = [
  { id: "mission", label: "Ma mission" },
  { id: "soumissions", label: "Mes soumissions" },
  { id: "attention", label: "Attention" },
  { id: "documents", label: "Mes documents" },
];

const MISSING_KPI_ID = "esg_2024";

export default function StaffPage() {
  return (
    <Suspense fallback={null}>
      <StaffPageInner />
    </Suspense>
  );
}

function StaffPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useRoleContext();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await getTickets(ctx);
    setTickets(list);
  }, [ctx]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const unsubscribe = subscribeToStore(() => {
      void refresh();
    });
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    const qp = searchParams.get("ticket");
    if (qp) {
      const openTimer = window.setTimeout(() => {
        setOpenTicketId(qp);
      }, 0);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ticket");
      const query = params.toString();
      router.replace(query ? `/staff?${query}` : "/staff", { scroll: false });
      return () => window.clearTimeout(openTimer);
    }
  }, [router, searchParams]);

  const tanitWantsToTalk = tickets.some(
    (t) => t.escalation_level === "tanit" && t.status !== "resolved",
  );
  const myTicket = tickets.find((t) => t.status !== "resolved") ?? tickets[0];

  return (
    <div className="px-10 pt-8 pb-20 max-w-[1320px] mx-auto">
      {/* Quick-access nav */}
      <nav className="mb-10 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/80 backdrop-blur px-1.5 py-1">
          {QUICK_NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* §1 — MA MISSION */}
      <section id="mission" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Ma mission
          </div>
          <div className="font-display italic text-[18px] text-zinc-700 mt-1">
            vos contributions à l&apos;Université de Carthage
          </div>
        </div>

        <TanitCard>
          <div className="flex items-start gap-5 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
                Bonjour {ctx.name.split(" ")[0]} ·
                {" "}
                <span className="text-zinc-700">ENIB · Bizerte</span>
              </div>
              <div className="mt-2 font-mono text-[34px] font-semibold leading-none text-zinc-950">
                86 %
              </div>
              <div className="mt-2 text-[13px] text-zinc-700">
                de votre soumission 2024-2025 est complète.
              </div>
              <div className="mt-1 text-[12px] text-zinc-500 font-mono">
                6 / 7 indicateurs · 1 manquant
              </div>
            </div>
            <div className="flex-1 min-w-[260px] max-w-[480px] mt-2">
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden flex">
                <div className="bg-emerald-500" style={{ width: "86%" }} />
                <div className="bg-red-500" style={{ width: "14%" }} />
              </div>
              <div className="mt-2 text-[11.5px] text-zinc-500">
                Compléter ESG 2024 fait passer ENIB à 100% pour la période.
              </div>
            </div>
          </div>
        </TanitCard>
      </section>

      {/* §2 — MES SOUMISSIONS */}
      <section id="soumissions" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Mes soumissions
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            période 2024-2025
          </div>
        </div>

        <TanitCard>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_KPIS_2024_2025.map((kpi) => {
              const missing = kpi.id === MISSING_KPI_ID;
              return (
                <button
                  key={kpi.id}
                  onClick={() => {
                    if (missing && myTicket) setOpenTicketId(myTicket.id);
                  }}
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-md text-[12.5px] font-medium border transition ${
                    missing
                      ? "border-red-300 bg-red-50/50 text-red-700 hover:bg-red-50"
                      : "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                  }`}
                >
                  {missing ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
                  ) : (
                    <Check size={13} />
                  )}
                  {kpi.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-[12.5px] text-zinc-600">
              <span className="font-mono text-zinc-900">6 / 7</span> documents
              soumis · 1 manquant
            </div>
            {myTicket ? (
              <button
                onClick={() => setOpenTicketId(myTicket.id)}
                className="text-[12px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Voir le ticket <ArrowRight size={12} />
              </button>
            ) : null}
          </div>
        </TanitCard>
      </section>

      {/* §3 — ATTENTION */}
      <section id="attention" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Attention
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            ce qui requiert votre action
          </div>
        </div>

        {tanitWantsToTalk && myTicket ? (
          <TanitCard className="border-l-2 border-l-blue-500 brand-glow mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-blue-700">
                  Tanit veut vous parler
                </div>
                <div className="font-display italic text-[16px] text-zinc-900 mt-1.5">
                  une nouvelle conversation est ouverte
                </div>
                <div className="text-[13px] text-zinc-700 mt-2 leading-relaxed">
                  Tanit propose de vous aider à enregistrer l&apos;indicateur ESG
                  2024 directement à partir d&apos;une photo de votre document.
                </div>
              </div>
              <button
                onClick={() => setOpenTicketId(myTicket.id)}
                className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-md text-white font-medium text-[13px] brand-glow"
                style={{ background: "linear-gradient(180deg,#3b82f6, #1B487E)" }}
              >
                <MessageSquare size={14} /> Ouvrir la conversation
              </button>
            </div>
          </TanitCard>
        ) : null}

        <TanitCard padded={false}>
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
              Tickets ouverts
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {tickets.filter((t) => t.status !== "resolved").length}
            </span>
          </div>
          {tickets.length === 0 ? (
            <div className="px-6 py-10 text-center text-[12.5px] text-zinc-500">
              Aucun ticket ouvert.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {tickets.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTicketId(t.id)}
                  className="w-full text-left px-6 py-3.5 hover:bg-zinc-50 transition flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-zinc-900">
                      {t.title}
                    </div>
                    <div className="text-[11.5px] font-mono text-zinc-500 mt-0.5">
                      {t.escalation_level} ·{" "}
                      {fmtFR(t.escalated_at ?? t.created_at)}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-zinc-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </TanitCard>
      </section>

      {/* §4 — MES DOCUMENTS */}
      <section id="documents" className="mb-2 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Mes documents
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            7 indicateurs requis
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REQUIRED_KPIS_2024_2025.map((kpi) => {
            const missing = kpi.id === MISSING_KPI_ID;
            return (
              <button
                key={kpi.id}
                onClick={() => {
                  if (missing && myTicket) setOpenTicketId(myTicket.id);
                }}
                className={`group text-left rounded-lg border bg-white p-5 transition-all ${
                  missing
                    ? "border-red-300 hover:border-red-400 hover:shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-9 h-9 rounded-md grid place-items-center ${
                      missing
                        ? "bg-red-50 border border-red-200 text-red-600"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                    }`}
                  >
                    {missing ? <FileText size={16} /> : <Check size={16} />}
                  </div>
                  <span
                    className={`text-[10.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      missing
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {missing ? "Manquant" : "Soumis"}
                  </span>
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-zinc-500">
                  {kpi.label}
                </div>
                <div className="font-mono text-[20px] font-semibold leading-tight text-zinc-950 mt-1">
                  {missing ? "À compléter" : "OK"}
                </div>
                <div className="text-[11.5px] text-zinc-500 mt-1">
                  Période 2024-2025
                </div>
                {missing ? (
                  <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 group-hover:text-blue-700">
                    Ouvrir le ticket <ArrowRight size={12} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <TicketDetailSheet
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />
      <TanitDock question="Comment Tanit peut-il m'aider à compléter ma soumission?" />
    </div>
  );
}
