import { Inbox } from "lucide-react";

export function DomainEmptyState({ domain }: { domain: string }) {
  const labels: Record<string, string> = {
    finance: "financiers",
    research: "de recherche",
    esg: "ESG",
    infrastructure: "d'infrastructure",
  };

  return (
    <div className="px-6 py-16 grid place-items-center text-center">
      <div className="w-14 h-14 rounded-full border border-zinc-200 grid place-items-center text-zinc-300 mb-5">
        <Inbox size={22} />
      </div>
      <div className="text-[15px] text-zinc-700 font-medium">
        Données en attente de soumission
      </div>
      <div className="text-[12.5px] text-zinc-500 mt-1.5 max-w-md leading-relaxed">
        Tanit collecte les indicateurs {labels[domain] ?? domain} auprès des 33
        établissements. Les premières soumissions sont attendues d&apos;ici fin
        avril.
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/[0.06] text-blue-600">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />7
        soumissions en cours de traitement
      </div>
    </div>
  );
}
