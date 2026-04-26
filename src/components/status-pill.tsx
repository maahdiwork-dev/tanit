import type { SubmissionStatus } from "@/types/api";

export function StatusPill({ status }: { status: SubmissionStatus }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Soumis
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-600 border border-red-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
      Manquant
    </span>
  );
}
