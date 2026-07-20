"use client";

import { EloLastTenGamesPanel } from "@/components/EloLastTenGamesPanel";
import { EloPlayerNameAutocomplete } from "@/components/EloPlayerNameAutocomplete";
import { EloStatsWinLossTable } from "@/components/EloStatsWinLossTable";
import type { EloPlayerDashboardWithH2H } from "@/features/elo/player-dashboard-data";
import { RP_ROUTES } from "@/lib/site-routes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PlayerOption = {
  playerId: string;
  nickname: string;
  elo: number;
  tier: number;
};

const RACE_LABELS: Record<string, string> = {
  P: "프로토스",
  T: "테란",
  Z: "저그",
};

export function EloPlayerStatsDashboard({
  initialPlayerId,
}: {
  initialPlayerId: string | null;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId ?? "");
  const [opponentPlayerId, setOpponentPlayerId] = useState("");
  const [dashboard, setDashboard] = useState<EloPlayerDashboardWithH2H | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/elo/players/options")
      .then((response) => response.json())
      .then((json: { players?: PlayerOption[] }) => {
        setPlayers(json.players ?? []);
      })
      .catch(() => setPlayers([]));
  }, []);

  const loadDashboard = useCallback(async (playerId: string, opponentId?: string) => {
    if (!playerId) {
      setDashboard(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = opponentId ? `?opponent=${encodeURIComponent(opponentId)}` : "";
      const response = await fetch(`/api/elo/players/${playerId}/stats${query}`);
      const json = (await response.json()) as EloPlayerDashboardWithH2H & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "데이터를 불러오지 못했습니다.");
        setDashboard(null);
        return;
      }
      setDashboard(json);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialPlayerId) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setDashboard(null);
      return;
    }
    void loadDashboard(selectedPlayerId, opponentPlayerId || undefined);
  }, [selectedPlayerId, opponentPlayerId, loadDashboard]);

  function handlePlayerChange(playerId: string) {
    setSelectedPlayerId(playerId);
    setOpponentPlayerId("");
    if (playerId) {
      router.push(RP_ROUTES.player(playerId));
    } else {
      router.push(RP_ROUTES.players);
    }
  }

  const summary = dashboard?.summary;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <label className="block text-sm text-[var(--muted)]">선수 이름</label>
        <div className="mt-2">
          <EloPlayerNameAutocomplete
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelect={handlePlayerChange}
            placeholder="닉네임을 입력하세요"
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          닉네임 일부만 입력해도 자동완성 목록이 표시됩니다. Enter로 선택할 수 있습니다.
        </p>
      </div>

      {!selectedPlayerId ? (
        <p className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          상단에 선수 이름을 입력하면 개인 성적이 표시됩니다.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중...</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {summary ? (
        <>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {summary.nickname} / {summary.tier}티어 / Point : {summary.elo} / Rank :{" "}
              {summary.rank ?? "-"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {RACE_LABELS[summary.race] ?? summary.race}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <EloStatsWinLossTable
              title="종족 DATA"
              headerClassName="bg-red-500/20 text-red-100"
              rows={dashboard.raceStats}
            />
            <EloStatsWinLossTable
              title="리그 DATA"
              headerClassName="bg-blue-500/20 text-blue-100"
              rows={dashboard.leagueStats}
            />
            <EloStatsWinLossTable
              title="맵 DATA"
              headerClassName="bg-emerald-500/20 text-emerald-100"
              rows={dashboard.mapStats}
              emptyMessage="맵 기록이 없습니다."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <EloLastTenGamesPanel
              games={dashboard.lastTenGames}
              playerNickname={summary.nickname}
            />

            <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
              <div className="border-b border-[var(--card-border)] bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-100">
                연승 DATA
              </div>
              <div className="space-y-3 p-4 text-sm">
                <p>
                  <span className="text-[var(--muted)]">현재</span>{" "}
                  <span className="font-medium">{dashboard.streak.currentLabel}</span>
                </p>
                <p>
                  <span className="text-[var(--muted)]">최다 연승</span>{" "}
                  <span className="font-medium">{dashboard.streak.maxWinStreak}</span>
                </p>
                <p>
                  <span className="text-[var(--muted)]">최다 연패</span>{" "}
                  <span className="font-medium">{dashboard.streak.maxLossStreak}</span>
                </p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
              <div className="border-b border-[var(--card-border)] bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100">
                티어 DATA
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-[var(--card-border)]/60 text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">상대 티어</th>
                      <th className="px-3 py-2 font-medium">승</th>
                      <th className="px-3 py-2 font-medium">패</th>
                      <th className="px-3 py-2 font-medium">승률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.tierStats.map((row) => (
                      <tr
                        key={row.tier}
                        className="border-b border-[var(--card-border)]/40 last:border-b-0"
                      >
                        <td className="px-3 py-2 font-medium">{row.tier}</td>
                        <td className="px-3 py-2 tabular-nums">{row.wins}</td>
                        <td className="px-3 py-2 tabular-nums">{row.losses}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {row.winRate === null ? "-" : `${row.winRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
              <div className="border-b border-[var(--card-border)] bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100">
                상대전적 검색
              </div>
              <div className="space-y-4 p-4">
                <select
                  value={opponentPlayerId}
                  onChange={(event) => setOpponentPlayerId(event.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="">상대 선수 선택</option>
                  {dashboard.headToHeadOpponents.map((opponent) => (
                    <option key={opponent.playerId} value={opponent.playerId}>
                      {opponent.nickname}
                    </option>
                  ))}
                </select>

                {dashboard.headToHead ? (
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/40 p-4 text-sm">
                    <p className="font-medium">
                      {summary.nickname} vs {dashboard.headToHead.opponentNickname}
                    </p>
                    <p className="mt-2">
                      {dashboard.headToHead.wins}승 {dashboard.headToHead.losses}패
                      {dashboard.headToHead.winRate !== null
                        ? ` (${dashboard.headToHead.winRate}%)`
                        : ""}
                    </p>
                  </div>
                ) : opponentPlayerId ? (
                  <p className="text-sm text-[var(--muted)]">상대 전적이 없습니다.</p>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    맞대결한 상대를 선택하면 전적이 표시됩니다.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
