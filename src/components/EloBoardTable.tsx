import type { EloBoardRow } from "@/features/elo/board-data";
import { RP_ROUTES } from "@/lib/site-routes";
import Link from "next/link";

const RACE_LABELS: Record<string, string> = {
  P: "프토",
  T: "테란",
  Z: "저그",
};

export function EloBoardTable({ rows }: { rows: EloBoardRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        표시할 선수가 없습니다. 로스터에 선수를 등록한 뒤 RP를 동기화해 주세요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--card-border)] bg-[var(--background)]/50 text-left text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">순위</th>
            <th className="px-4 py-3 font-medium">선수</th>
            <th className="px-4 py-3 font-medium">RP</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">티어</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">종족</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.clanMemberId}
              className="border-b border-[var(--card-border)] last:border-b-0 transition hover:bg-[var(--background)]/40"
            >
              <td className="px-4 py-3 text-[var(--muted)]">{index + 1}</td>
              <td className="px-4 py-3">
                {row.playerId ? (
                  <Link
                    href={RP_ROUTES.player(row.playerId)}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {row.nickname}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--foreground)]">{row.nickname}</span>
                )}
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums text-[var(--foreground)]">
                {row.elo}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">{row.tier}</td>
              <td className="hidden px-4 py-3 md:table-cell">
                {RACE_LABELS[row.race] ?? row.race}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
