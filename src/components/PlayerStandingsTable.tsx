"use client";

import {
  formatMatchupRecord,
  formatWinLossUpsetRecord,
  type PlayerDetailStanding,
} from "@/lib/player-stats";
import { useMemo, useState } from "react";

type SortKey =
  | "nickname"
  | "vsZerg"
  | "vsProtoss"
  | "vsTerran"
  | "games"
  | "wins"
  | "winRate";

type SortDir = "asc" | "desc";

const RACE_OPTIONS = ["P", "T", "Z"] as const;

const RACE_LABELS: Record<string, string> = {
  P: "프로토스",
  T: "테란",
  Z: "저그",
};

function matchupWinRate(record: { wins: number; losses: number }) {
  const total = record.wins + record.losses;
  if (total === 0) return 0;
  return record.wins / total;
}

function compareRows(a: PlayerDetailStanding, b: PlayerDetailStanding, key: SortKey) {
  switch (key) {
    case "nickname":
      return a.nickname.localeCompare(b.nickname, "ko");
    case "vsZerg":
      return matchupWinRate(a.vsZerg) - matchupWinRate(b.vsZerg) || a.vsZerg.wins - b.vsZerg.wins;
    case "vsProtoss":
      return (
        matchupWinRate(a.vsProtoss) - matchupWinRate(b.vsProtoss) ||
        a.vsProtoss.wins - b.vsProtoss.wins
      );
    case "vsTerran":
      return (
        matchupWinRate(a.vsTerran) - matchupWinRate(b.vsTerran) ||
        a.vsTerran.wins - b.vsTerran.wins
      );
    case "games":
      return a.games - b.games;
    case "wins":
      return a.wins - b.wins || a.losses - b.losses;
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
  const [minGames, setMinGames] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [raceFilter, setRaceFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const teams = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const row of rows) {
      map.set(row.teamId, { name: row.teamName, color: row.teamColor });
    }
    return Array.from(map.entries())
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [rows]);

  const minGamesValue = minGames.trim() === "" ? 0 : Number.parseInt(minGames, 10);

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
      .filter((row) =>
        Number.isFinite(minGamesValue) && minGamesValue > 0 ? row.games >= minGamesValue : true,
      )
      .sort((a, b) => {
        const result = compareRows(a, b, sortKey);
        return sortDir === "asc" ? result : -result;
      });
  }, [rows, search, teamFilter, raceFilter, minGamesValue, sortKey, sortDir]);

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

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  const columns: { key: SortKey; header: string; className?: string }[] = [
    { key: "vsZerg", header: "저그전", className: "min-w-[4.5rem]" },
    { key: "vsProtoss", header: "프로토스전", className: "min-w-[5.5rem]" },
    { key: "vsTerran", header: "테란전", className: "min-w-[4.5rem]" },
    { key: "games", header: "총경기수", className: "min-w-[5rem]" },
    { key: "wins", header: "총전적", className: "min-w-[4.5rem]" },
    { key: "winRate", header: "승률", className: "min-w-[4rem]" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 text-sm text-[var(--muted)]">
          <p>
            세트 결과 기준 개인 전적 · 종족 상대 전적 · 업셋은 자기보다 상위 티어(숫자가 작은
            티어) 상대에게 이긴 횟수
          </p>
          {Number.isFinite(minGamesValue) && minGamesValue > 0 ? (
            <p className="text-[var(--foreground)]">
              대상: 총 전적 {minGamesValue}전 이상
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="선수·팀 검색"
            className="w-40 rounded-lg border border-[var(--card-border)] bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
          <input
            type="number"
            min={0}
            value={minGames}
            onChange={(event) => setMinGames(event.target.value)}
            placeholder="최소 경기수"
            className="w-28 rounded-lg border border-[var(--card-border)] bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
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
        <table className="w-full min-w-[760px] text-sm">
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
                  colSpan={columns.length + 2}
                  className="px-4 py-8 text-center text-[var(--muted)]"
                >
                  검색·필터 조건에 해당하는 선수가 없습니다.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr
                  key={row.playerId}
                  className="border-b border-[var(--card-border)]/60 last:border-b-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-center text-[var(--muted)]">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{row.nickname}</span>
                        <span className="text-xs text-[var(--muted)]">
                          {RACE_LABELS[row.race] ?? row.race}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTeamFilter(row.teamId)}
                        className="mt-0.5 text-xs transition hover:underline"
                        style={{ color: row.teamColor }}
                      >
                        {row.teamName}
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {formatMatchupRecord(row.vsZerg)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {formatMatchupRecord(row.vsProtoss)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {formatMatchupRecord(row.vsTerran)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">
        선수·팀명 검색, 최소 경기수, 소속팀·종족 필터를 사용할 수 있습니다. 열 제목을 클릭하면
        정렬됩니다. 기본 정렬은 승수 내림차순입니다.
      </p>
    </div>
  );
}
