"use client";

import {
  comparePlayerDetailStandings,
  formatPlayerSetHistoryLine,
  formatWinLossUpsetRecord,
  type PlayerDetailStanding,
  type PlayerSetHistoryEntry,
} from "@/lib/player-stats";
import { Fragment, useMemo, useState } from "react";

type SortKey = "nickname" | "games" | "wins" | "winRate";

type SortDir = "asc" | "desc";

const RACE_OPTIONS = ["P", "T", "Z"] as const;

const RACE_LABELS: Record<string, string> = {
  P: "프로토스",
  T: "테란",
  Z: "저그",
};

function compareRows(a: PlayerDetailStanding, b: PlayerDetailStanding, key: SortKey) {
  switch (key) {
    case "nickname":
      return a.nickname.localeCompare(b.nickname, "ko");
    case "games":
      return a.games - b.games;
    case "wins":
      return -comparePlayerDetailStandings(a, b);
    case "winRate":
      return a.winRate - b.winRate;
    default:
      return 0;
  }
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <span className="ml-1 text-[var(--muted)]/50">↕</span>;
  }

  return <span className="ml-1 text-[var(--accent)]">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function PlayerStandingsTable({
  rows,
  emptyMessage = "개인 전적 데이터가 없습니다.",
}: {
  rows: PlayerDetailStanding[];
  emptyMessage?: string;
}) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [raceFilter, setRaceFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, PlayerSetHistoryEntry[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const teams = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const row of rows) {
      map.set(row.teamId, { name: row.teamName, color: row.teamColor });
    }
    return Array.from(map.entries())
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (!query) return true;
        return (
          row.nickname.toLowerCase().includes(query) ||
          row.teamName.toLowerCase().includes(query)
        );
      })
      .filter((row) => (teamFilter ? row.teamId === teamFilter : true))
      .filter((row) => (raceFilter ? row.race === raceFilter : true))
      .sort((a, b) => {
        const result = compareRows(a, b, sortKey);
        return sortDir === "asc" ? result : -result;
      });
  }, [rows, search, teamFilter, raceFilter, sortKey, sortDir]);

  const columnCount = 5;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "nickname" ? "asc" : "desc");
  }

  function toggleTeamFilter(teamId: string) {
    setTeamFilter((prev) => (prev === teamId ? null : teamId));
  }

  function toggleRaceFilter(race: string) {
    setRaceFilter((prev) => (prev === race ? null : race));
  }

  async function togglePlayerHistory(playerId: string) {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null);
      setHistoryError(null);
      return;
    }

    setExpandedPlayerId(playerId);
    setHistoryError(null);

    if (historyCache[playerId]) {
      return;
    }

    setHistoryLoadingId(playerId);

    try {
      const response = await fetch(`/api/players/${playerId}/history`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "경기 목록을 불러오지 못했습니다.");
      }

      setHistoryCache((prev) => ({
        ...prev,
        [playerId]: json.history as PlayerSetHistoryEntry[],
      }));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "경기 목록을 불러오지 못했습니다.");
    } finally {
      setHistoryLoadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  const columns: { key: SortKey; header: string; className?: string }[] = [
    { key: "games", header: "총경기수", className: "min-w-[5rem]" },
    { key: "wins", header: "총전적 (업셋횟수)", className: "min-w-[6.5rem]" },
    { key: "winRate", header: "승률", className: "min-w-[4rem]" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 text-sm text-[var(--muted)]">
          <p>선수 탭을 클릭하면 경기목록이 표시됩니다.</p>
          <p>업셋은 자신보다 상위 티어 상대에게 이긴 횟수입니다.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="선수·팀 검색"
            className="w-40 rounded-lg border border-[var(--card-border)] bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">
        <span className="font-medium text-[var(--muted)]">소속팀</span>
        <button
          type="button"
          onClick={() => setTeamFilter(null)}
          className={`rounded-full border px-3 py-1 transition ${
            teamFilter === null
              ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
              : "border-[var(--card-border)] hover:border-[var(--accent)]"
          }`}
        >
          전체
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => toggleTeamFilter(team.id)}
            className={`rounded-full border px-3 py-1 transition ${
              teamFilter === team.id
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-[var(--card-border)] hover:border-[var(--accent)]"
            }`}
            style={teamFilter === team.id ? undefined : { color: team.color }}
          >
            {team.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">
        <span className="font-medium text-[var(--muted)]">종족</span>
        <button
          type="button"
          onClick={() => setRaceFilter(null)}
          className={`rounded-full border px-3 py-1 transition ${
            raceFilter === null
              ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
              : "border-[var(--card-border)] hover:border-[var(--accent)]"
          }`}
        >
          전체
        </button>
        {RACE_OPTIONS.map((race) => (
          <button
            key={race}
            type="button"
            onClick={() => toggleRaceFilter(race)}
            className={`rounded-full border px-3 py-1 transition ${
              raceFilter === race
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-[var(--card-border)] hover:border-[var(--accent)]"
            }`}
          >
            {RACE_LABELS[race]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
              <th className="w-14 whitespace-nowrap px-4 py-3 font-medium">순위</th>
              <th className="min-w-[200px] whitespace-nowrap px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("nickname")}
                  className="inline-flex items-center whitespace-nowrap transition hover:text-[var(--foreground)]"
                >
                  플레이어
                  <SortIndicator active={sortKey === "nickname"} dir={sortDir} />
                </button>
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 font-medium ${column.className ?? ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center whitespace-nowrap transition hover:text-[var(--foreground)]"
                  >
                    {column.header}
                    <SortIndicator active={sortKey === column.key} dir={sortDir} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-[var(--muted)]"
                >
                  검색·필터 조건에 해당하는 선수가 없습니다.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => {
                const isExpanded = expandedPlayerId === row.playerId;
                const history = historyCache[row.playerId];
                const isLoadingHistory = historyLoadingId === row.playerId;

                return (
                  <Fragment key={row.playerId}>
                    <tr
                      role="button"
                      tabIndex={0}
                      onClick={() => void togglePlayerHistory(row.playerId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void togglePlayerHistory(row.playerId);
                        }
                      }}
                      className={`cursor-pointer border-b border-[var(--card-border)]/60 transition hover:bg-white/5 ${
                        isExpanded ? "bg-white/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-[var(--muted)]">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-medium ${
                                isExpanded ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                              }`}
                            >
                              {row.nickname}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {RACE_LABELS[row.race] ?? row.race}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTeamFilter(row.teamId);
                            }}
                            className="mt-0.5 text-xs transition hover:underline"
                            style={{ color: row.teamColor }}
                          >
                            {row.teamName}
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">{row.games}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {formatWinLossUpsetRecord(row.wins, row.losses, row.upsets)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span
                          className={
                            row.winRate >= 50 ? "font-semibold text-[var(--accent)]" : "text-sky-300"
                          }
                        >
                          {row.winRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-[var(--card-border)]/60 bg-black/15">
                        <td colSpan={columnCount} className="px-4 py-4">
                          {isLoadingHistory ? (
                            <p className="text-sm text-[var(--muted)]">경기 목록 불러오는 중...</p>
                          ) : historyError && !history ? (
                            <p className="text-sm text-red-400">{historyError}</p>
                          ) : history && history.length > 0 ? (
                            <ul className="space-y-1 font-mono text-sm">
                              {history.map((entry, entryIndex) => (
                                <li
                                  key={`${row.playerId}-${entryIndex}`}
                                  className={
                                    entry.outcome === "win" ? "text-emerald-300" : "text-red-300"
                                  }
                                >
                                  {formatPlayerSetHistoryLine(entry)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[var(--muted)]">기록된 경기가 없습니다.</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">
        선수·팀명 검색, 소속팀·종족 필터를 사용할 수 있습니다. 열 제목을 클릭하면 정렬됩니다.
        기본 정렬은 승수 내림차순입니다.
      </p>
    </div>
  );
}
