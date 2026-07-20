import type { WinLossRow } from "@/lib/player-dashboard-stats";

function WinRateBar({ winRate }: { winRate: number | null }) {
  const width = winRate ?? 0;

  return (
    <div className="flex min-w-[88px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${Math.min(width, 100)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-[var(--muted)]">
        {winRate === null ? "-" : `${winRate}%`}
      </span>
    </div>
  );
}

export function EloStatsWinLossTable({
  title,
  headerClassName,
  rows,
  emptyMessage = "데이터가 없습니다.",
}: {
  title: string;
  headerClassName: string;
  rows: WinLossRow[];
  emptyMessage?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className={`border-b border-[var(--card-border)] px-4 py-2 text-sm font-semibold ${headerClassName}`}>
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[var(--card-border)]/60 text-left text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">구분</th>
                <th className="px-3 py-2 font-medium">승</th>
                <th className="px-3 py-2 font-medium">패</th>
                <th className="px-3 py-2 font-medium">승률</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-[var(--card-border)]/40 last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                    {row.label}
                    {row.pending ? (
                      <span className="ml-2 text-xs text-[var(--muted)]">준비중</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.wins}</td>
                  <td className="px-3 py-2 tabular-nums">{row.losses}</td>
                  <td className="px-3 py-2">
                    {row.pending ? (
                      <span className="text-xs text-[var(--muted)]">-</span>
                    ) : (
                      <WinRateBar winRate={row.winRate} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
