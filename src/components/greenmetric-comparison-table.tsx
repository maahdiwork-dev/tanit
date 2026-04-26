import { TanitCard } from "@/components/tanit-card";
import { cn } from "@/lib/utils";

const tunisianUniversities = [
  { rank: 1, university: "UCAR", worldRank: 688, score: 6260 },
  { rank: 2, university: "Sousse", worldRank: 898, score: 5567.5 },
  { rank: 3, university: "Manouba", worldRank: 914, score: 5510 },
  { rank: 4, university: "Jendouba", worldRank: 1079, score: 4875 },
  { rank: 5, university: "Sfax", worldRank: 1141, score: 4675 },
  { rank: 6, university: "Monastir", worldRank: 1177, score: 4505 },
  { rank: 7, university: "Tunis", worldRank: 1251, score: 4217.5 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function GreenMetricComparisonTable() {
  const maxScore = Math.max(...tunisianUniversities.map((row) => row.score));

  return (
    <TanitCard padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-zinc-100 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Rang Tunisie</th>
              <th className="px-6 py-3 font-medium">Université</th>
              <th className="px-6 py-3 font-medium">Rang mondial</th>
              <th className="px-6 py-3 font-medium">Score total</th>
              <th className="px-6 py-3 font-medium">Écart visuel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tunisianUniversities.map((row) => {
              const isUcar = row.university === "UCAR";

              return (
                <tr
                  key={row.university}
                  className={cn(
                    "transition-colors hover:bg-zinc-100/80",
                    isUcar && "bg-blue-500/[0.08] text-zinc-950",
                  )}
                >
                  <td className="px-6 py-3 font-mono text-zinc-700">
                    #{row.rank}
                  </td>
                  <td className="px-6 py-3 font-medium text-zinc-900">
                    {row.university}
                    {isUcar ? (
                      <span className="ml-2 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Présidence
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-3 font-mono text-zinc-600">
                    #{row.worldRank}
                  </td>
                  <td className="px-6 py-3 font-mono text-zinc-900">
                    {formatNumber(row.score)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="h-2 min-w-[140px] overflow-hidden rounded-full bg-zinc-50">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isUcar ? "bg-blue-500" : "bg-zinc-600",
                        )}
                        style={{ width: `${(row.score / maxScore) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-100 px-6 py-3 text-[11px] text-zinc-500">
        Source: uigreenmetric.com · Édition 2025
      </div>
    </TanitCard>
  );
}
