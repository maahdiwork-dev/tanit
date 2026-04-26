"use client";

import {
  ArrowRight,
  Building2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import {
  getTickets,
  requestTanitOnTicket,
  subscribeToStore,
  type TicketSummary,
} from "@/lib/demo-mocks";
import { useRoleContext } from "@/lib/role-context";
import { TanitCard } from "@/components/tanit-card";
import { TanitDock } from "@/components/tanit-dock";
import { TicketDetailSheet } from "@/components/ticket-detail-sheet";
import {
  TanitToast,
  type TanitToastValue,
} from "@/components/tanit-toast";
import { fmtFR } from "@/components/tanit-constants";

const QUICK_NAV = [
  { id: "mission", label: "Mission" },
  { id: "etat", label: "État" },
  { id: "attention", label: "Attention" },
  { id: "explorer", label: "Explorer" },
];

const ENGINEERING_INSTITUTIONS = [
  { id: "ENIB", name: "ENIB · Bizerte", submissions: "6/7", missing: 1 },
  { id: "INSAT", name: "INSAT · Tunis", submissions: "7/7", missing: 0 },
  { id: "EPT", name: "EPT · Tunis", submissions: "7/7", missing: 0 },
  { id: "SUPCOM", name: "SUP'COM · Ariana", submissions: "7/7", missing: 0 },
  { id: "ENICar", name: "ENICarthage · Ariana", submissions: "7/7", missing: 0 },
  { id: "ENSTAB", name: "ENSTAB · Borj Cédria", submissions: "7/7", missing: 0 },
];

const STAFF_ENIB = [
  {
    id: "yassine_enib",
    name: "Yassine Ben Salem",
    role: "Coordinateur KPI",
    submissions: "6/7",
    missing: 1,
  },
  {
    id: "fatma_enib",
    name: "Fatma Trabelsi",
    role: "Service académique",
    submissions: "7/7",
    missing: 0,
  },
  {
    id: "hedi_enib",
    name: "Hedi Belkacem",
    role: "Service RH",
    submissions: "7/7",
    missing: 0,
  },
];

export default function DirectorPage() {
  return (
    <Suspense fallback={null}>
      <DirectorPageInner />
    </Suspense>
  );
}

function DirectorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useRoleContext();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<TanitToastValue>(null);

  const isDean = ctx.role === "dean";
  const scopeLabel = isDean
    ? "Domaine Ingénierie"
    : "ENIB · Ecole Nationale d'Ingénieurs de Bizerte";

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
      router.replace(query ? `/director?${query}` : "/director", {
        scroll: false,
      });
      return () => window.clearTimeout(openTimer);
    }
  }, [router, searchParams]);

  async function askTanit(ticket: TicketSummary) {
    if (requestingId) return;
    setRequestingId(ticket.id);
    try {
      await requestTanitOnTicket(ticket.id);
      setToast({
        title: "Tanit prend le relais",
        body: `Le ticket ${ticket.institution.id} ESG 2024 est confié à Tanit. Yassine reçoit une notification.`,
      });
      void refresh();
    } catch (err) {
      setToast({
        title: "Erreur",
        body: err instanceof Error ? err.message : "Action échouée",
      });
    } finally {
      setRequestingId(null);
    }
  }

  const myTickets = tickets.filter((t) => {
    if (isDean) return t.escalation_level === "dean";
    return (
      t.escalation_level === "director" ||
      t.escalation_level === "staff"
    );
  });

  const conformityCount = isDean ? 5 : 0;
  const totalScoped = isDean ? 6 : 1;
  const conformityRate = isDean ? 83 : 86;

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

      {/* §1 — MISSION */}
      <section id="mission" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            Mission
          </div>
          <div className="font-display italic text-[18px] text-zinc-700 mt-1">
            {isDean
              ? "engagement du domaine ingénierie"
              : "engagement de l'ENIB sur la mission UCAR"}
          </div>
        </div>

        <TanitCard>
          <div className="flex items-baseline gap-4 flex-wrap">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
                {scopeLabel}
              </div>
              <div className="mt-2 font-mono text-[42px] font-semibold leading-none text-zinc-950">
                {conformityRate}%
              </div>
              <div className="mt-2 text-[13px] text-zinc-700">
                {isDean
                  ? "engagement moyen sur la période 2024-2025"
                  : "des indicateurs 2024-2025 soumis"}
              </div>
              <div className="mt-1 text-[12px] text-zinc-500 font-mono">
                {isDean
                  ? `${conformityCount} / ${totalScoped} institutions à 100%`
                  : "6 / 7 indicateurs soumis · 1 manquant"}
              </div>
            </div>
            <div className="flex-1 min-w-[260px] max-w-[440px] mt-2">
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden flex">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${conformityRate}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${100 - conformityRate}%` }}
                />
              </div>
              <div className="mt-2 text-[11.5px] text-zinc-500">
                {isDean
                  ? "L'ENIB est la seule institution avec un indicateur en attente."
                  : "Compléter ESG 2024 fait passer ENIB à 100%."}
              </div>
            </div>
          </div>
        </TanitCard>
      </section>

      {/* §2 — ÉTAT */}
      <section id="etat" className="mb-12 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            État des soumissions
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            cycle 2024-2025
          </div>
        </div>

        <TanitCard padded={false}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr]">
            <div className="px-8 py-8 lg:border-r border-zinc-100 flex flex-col justify-center">
              <div className="font-mono text-[64px] leading-none font-semibold tracking-tight text-[#297CE9]">
                {conformityRate}%
              </div>
              <div className="text-[14px] text-zinc-700 mt-3">
                {isDean
                  ? "engagement moyen du domaine"
                  : "de votre institution est conforme"}
              </div>
              <div className="text-[12px] text-zinc-500 mt-1 font-mono">
                {isDean
                  ? `${conformityCount} / ${totalScoped} institutions à 100%`
                  : "6 / 7 indicateurs soumis"}
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
                <div className="text-[13px] font-medium text-zinc-900">
                  {isDean
                    ? "1 institution avec une action requise"
                    : "1 indicateur en attente"}
                </div>
              </div>
              <div className="text-[12.5px] text-zinc-700 leading-relaxed">
                {isDean
                  ? "L'ENIB attend la soumission de l'indicateur ESG 2024 par son équipe staff."
                  : "L'indicateur ESG 2024 n'est pas encore soumis."}
              </div>
              <div className="mt-5 text-[11.5px] text-zinc-500 font-mono">
                Dernière mise à jour ·{" "}
                {fmtFR(new Date().toISOString())}
              </div>
            </div>
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
            tickets escaladés vers vous
          </div>
        </div>

        <TanitCard padded={false}>
          {myTickets.length === 0 ? (
            <div className="px-6 py-10 text-center text-[12.5px] text-zinc-500">
              Aucun ticket à votre niveau pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {myTickets.map((t) => {
                const owner = t.current_owner;
                const ownerStatus = owner?.status === "out_of_office";
                const showAskTanit =
                  isDean && t.escalation_level === "dean";
                return (
                  <div
                    key={t.id}
                    className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-zinc-50/60 transition"
                  >
                    <button
                      onClick={() => setOpenTicketId(t.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13.5px] font-medium text-zinc-900">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11.5px] font-mono text-zinc-500">
                        <span>{t.institution.id}</span>
                        <span className="text-zinc-300">·</span>
                        <span>{t.escalation_level}</span>
                        {owner ? (
                          <>
                            <span className="text-zinc-300">·</span>
                            <span>{owner.name}</span>
                            {ownerStatus ? (
                              <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                absent
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </button>
                    {showAskTanit ? (
                      <button
                        onClick={() => void askTanit(t)}
                        disabled={requestingId === t.id}
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-white text-[12.5px] font-medium brand-glow disabled:opacity-70"
                        style={{
                          background:
                            "linear-gradient(180deg,#3b82f6, #1B487E)",
                        }}
                      >
                        <Sparkles size={13} />
                        {requestingId === t.id
                          ? "Demande…"
                          : "Demander à Tanit d'aider"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setOpenTicketId(t.id)}
                        className="shrink-0 text-[12px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        Ouvrir <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TanitCard>
      </section>

      {/* §4 — EXPLORER (drill-down) */}
      <section id="explorer" className="mb-2 scroll-mt-24">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-700">
            {isDean ? "Institutions du domaine" : "Personnel de l'ENIB"}
          </div>
          <div className="font-display italic text-[15px] text-zinc-700 mt-1">
            {isDean ? "explorer les 6 institutions" : "explorer votre équipe"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isDean ? ENGINEERING_INSTITUTIONS : STAFF_ENIB).map((entry) => (
            <TanitCard key={entry.id} className="h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-md grid place-items-center bg-blue-500/10 border border-blue-500/30 text-blue-700">
                  {isDean ? <Building2 size={16} /> : <UserCheck size={16} />}
                </div>
                {entry.missing > 0 ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 font-mono">
                    {entry.missing} manquant
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono">
                    À jour
                  </span>
                )}
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-zinc-500">
                {isDean ? "Institution" : "Membre"}
              </div>
              <div className="text-[15px] font-medium text-zinc-950 mt-1 leading-tight">
                {entry.name}
              </div>
              <div className="font-mono text-[13px] text-blue-700 mt-2">
                {entry.submissions} soumis
              </div>
              {!isDean && "role" in entry ? (
                <div className="text-[11.5px] text-zinc-500 mt-1">
                  {(entry as { role: string }).role}
                </div>
              ) : null}
            </TanitCard>
          ))}
        </div>
      </section>

      <TicketDetailSheet
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />
      <TanitDock
        question={
          isDean
            ? "Quelle institution requiert mon attention en priorité?"
            : "Quel est l'état de soumission de l'ENIB cette semaine?"
        }
      />
      <TanitToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
