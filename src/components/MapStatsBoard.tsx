import {
  formatWinRate,
  type MapMatchupCell,
  type MapStatsSummary,
  type MatchupKey,
  type MatchupStats,
} from "@/lib/map-stats";
import type { Race } from "@prisma/client";

const MATCHUP_KEYS: MatchupKey[] = ["PvZ", "TvP", "ZvT"];

const RACE_COLORS: Record<Race, string> = {
  P: "#60a5fa",
  T: "#4ade80",
  Z: "#c084fc",
};

function MatchupCard({ stats }: { stats: MatchupStats }) {
  return (
    <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <h4 className="text-lg font-bold text-[var(--accent)]">{stats.label}</h4>
      <p className="mt-1 text-sm text-[var(--muted)]">총 {stats.total}경기</p>

      {stats.total === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">기록 없음</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium" style={{ color: RACE_COLORS[stats.firstRace] }}>
              {stats.firstRaceLabel} ({stats.firstRace})
            </span>
            <span>
              {stats.firstWins}승 {stats.secondWins}패
            </span>
            <span className="font-semibold text-[var(--foreground)]">
              {formatWinRate(stats.firstWinRate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium" style={{ color: RACE_COLORS[stats.secondRace] }}>
              {stats.secondRaceLabel} ({stats.secondRace})
            </span>
            <span>
              {stats.secondWins}승 {stats.firstWins}패
            </span>
            <span className="font-semibold text-[var(--foreground)]">
              {formatWinRate(stats.secondWinRate)}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function MatchupCell({ stats }: { stats: MapMatchupCell }) {
  if (!stats) {
    return <span className="text-[var(--muted)]">-</span>;
  }

  return (
    <div className="space-y-1 text-xs leading-5">
      <p className="text-[var(--muted)]">{stats.total}경기</p>
      <p>
        <span style={{ color: RACE_COLORS[stats.firstRace] }}>{stats.firstRace}</span>{" "}
        {stats.firstWins}-{stats.secondWins}{" "}
        <span style={{ color: RACE_COLORS[stats.secondRace] }}>{stats.secondRace}</span>
      </p>
      <p className="font-medium text-[var(--foreground)]">
        {stats.firstRace} {formatWinRate(stats.firstWinRate)}
      </p>
    </div>
  );
}

export function MapStatsBoard({ stats }: { stats: MapStatsSummary }) {
  if (stats.totalSets === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        아직 집계할 세트 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">전체 맵 상성</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {MATCHUP_KEYS.map((key) => (
            <MatchupCard key={key} stats={stats.overall[key]} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">맵별 상성</h3>
        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">맵</th>
                <th className="px-4 py-3 font-medium">경기수</th>
                {MATCHUP_KEYS.map((key) => (
                  <th key={key} className="px-4 py-3 font-medium">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.byMap.map((row) => (
                <tr
                  key={row.mapName}
                  className="border-b border-[var(--card-border)]/60 last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium">{row.mapName}</td>
                  <td className="px-4 py-3">{row.total}</td>
                  {MATCHUP_KEYS.map((key) => (
                    <td key={key} className="px-4 py-3">
                      <MatchupCell stats={row.matchups[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
