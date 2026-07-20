import { formatMatchDate } from "@/lib/match-display";
import type { LastGameRow } from "@/lib/player-dashboard-stats";

export function EloLastTenGamesPanel({
  games,
  playerNickname,
}: {
  games: LastGameRow[];
  playerNickname: string;
}) {
  const wins = games.filter((game) => game.outcome === "win").length;
  const losses = games.length - wins;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className="border-b border-[var(--card-border)] bg-black/40 px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
        최근 10경기
      </div>

      {games.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
          최근 경기 기록이 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--card-border)]/60 text-left text-[var(--muted)]">
                <tr>
                  <th className="px-2 py-2 font-medium">날짜</th>
                  <th className="px-2 py-2 font-medium">리그</th>
                  <th className="px-2 py-2 font-medium">맵</th>
                  <th className="px-2 py-2 font-medium">승자</th>
                  <th className="px-2 py-2 font-medium">패자</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
                  <tr
                    key={`${game.date}-${game.mapName}-${index}`}
                    className="border-b border-[var(--card-border)]/40 last:border-b-0"
                  >
                    <td className="px-2 py-2 whitespace-nowrap text-[var(--muted)]">
                      {formatMatchDate(game.date ? new Date(game.date) : null)}
                    </td>
                    <td className="px-2 py-2">{game.league}</td>
                    <td className="px-2 py-2">{game.mapName ?? "-"}</td>
                    <td
                      className={`px-2 py-2 ${
                        game.winner === playerNickname ? "font-medium text-emerald-300" : ""
                      }`}
                    >
                      {game.winner}
                    </td>
                    <td
                      className={`px-2 py-2 ${
                        game.loser === playerNickname ? "font-medium text-red-300" : ""
                      }`}
                    >
                      {game.loser}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
            <p className="text-xs text-[var(--muted)]">Last 10 Games</p>
            <p className="mt-2 text-lg font-semibold">
              {wins}승 {losses}패
            </p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/30">
              {games.length > 0 ? (
                <>
                  <div
                    className="bg-emerald-500/80"
                    style={{ width: `${(wins / games.length) * 100}%` }}
                  />
                  <div
                    className="bg-red-500/70"
                    style={{ width: `${(losses / games.length) * 100}%` }}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
