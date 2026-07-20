import type { WalletPointsLeaderboardEntry } from "@/lib/points";

export function WalletPointsLeaderboard({
  rows,
  pointsColumnLabel = "보유 포인트",
  pointsSuffix = "P",
  emptyMessage = "아직 포인트 기록이 없습니다. Discord 로그인 후 참여해 보세요.",
}: {
  rows: WalletPointsLeaderboardEntry[];
  pointsColumnLabel?: string;
  pointsSuffix?: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--card-border)] bg-[var(--background)]/50 text-left text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">순위</th>
            <th className="px-4 py-3 font-medium">닉네임</th>
            <th className="px-4 py-3 text-right font-medium">{pointsColumnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.discordUserId}
              className={`border-b border-[var(--card-border)] last:border-b-0 transition ${
                row.isMe ? "bg-[var(--accent)]/10" : "hover:bg-[var(--background)]/40"
              }`}
            >
              <td className="px-4 py-3 text-[var(--muted)]">{row.rank}</td>
              <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                {row.displayName}
                {row.isMe ? (
                  <span className="ml-2 text-xs font-normal text-[var(--accent)]">나</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--accent)]">
                {row.points} {pointsSuffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
