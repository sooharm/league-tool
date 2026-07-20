"use client";

import { FORM_FIELD_CLASS } from "@/lib/form-styles";
import { estimatePayout } from "@/lib/prediction-odds";
import type { WalletPointsLeaderboardEntry } from "@/lib/points";
import { WalletPointsLeaderboard } from "@/components/WalletPointsLeaderboard";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TeamInfo = {
  id: string;
  name: string;
  color: string;
};

type PlayerInfo = {
  id: string;
  nickname: string;
  tier: number;
  race: string;
};

type SetCard = {
  setId: string;
  orderIndex: number;
  tierBracket: string;
  homePlayer: PlayerInfo | null;
  awayPlayer: PlayerInfo | null;
  winnerPlayer: PlayerInfo | null;
  odds: {
    home: number;
    away: number;
    homeLabel: string;
    awayLabel: string;
  };
  pools: { home: number; away: number; total: number };
  predictionOpen: boolean;
  playersPublished: boolean;
  playersReady: boolean;
  hasResult: boolean;
  myBet: {
    pickedPlayerId: string;
    stake: number;
    status: string;
    payoutAmount: number | null;
  } | null;
};

type MatchCard = {
  matchId: string;
  week: number;
  round: number;
  scheduledAt: string | null;
  status: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  predictionOpen: boolean;
  sets: SetCard[];
};

type PointsLeaderboardEntry = WalletPointsLeaderboardEntry;

type PredictPayload = {
  loggedIn: boolean;
  previewMode?: boolean;
  usingPreviewFallback?: boolean;
  boardMode?: "results" | "upcoming" | "closed";
  points: number;
  pointsLeaderboard: PointsLeaderboardEntry[];
  entryDayLabel: string | null;
  matches: MatchCard[];
};

function formatScheduleDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function betStatusLabel(status: string) {
  if (status === "WON") return "적중";
  if (status === "LOST") return "미적중";
  if (status === "REFUNDED") return "환급";
  return "대기";
}

function playerLabel(player: PlayerInfo) {
  return `${player.nickname} (T${player.tier})`;
}

function PointsLeaderboardTable({ rows }: { rows: PointsLeaderboardEntry[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        아직 보유 포인트 기록이 없습니다. Discord 로그인 후 배팅에 참여해 보세요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--card-border)] bg-[var(--background)]/50 text-left text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">순위</th>
            <th className="px-4 py-3 font-medium">닉네임</th>
            <th className="px-4 py-3 text-right font-medium">보유 포인트</th>
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
                {row.points} P
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayerDuelPanel({
  player,
  teamColor,
  oddsLabel,
  poolAmount,
  isWinner,
  isResultsMode,
  muted,
}: {
  player: PlayerInfo;
  teamColor: string;
  oddsLabel?: string;
  poolAmount?: number;
  isWinner?: boolean;
  isResultsMode?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-[var(--background)]/40 p-4 transition ${
        isResultsMode && isWinner
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30"
          : isResultsMode && muted
            ? "border-[var(--card-border)] opacity-60"
            : "border-[var(--card-border)]"
      }`}
      style={{ borderLeftWidth: "4px", borderLeftColor: teamColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold" style={{ color: teamColor }}>
          {playerLabel(player)}
        </p>
        {isResultsMode && isWinner ? (
          <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--background)]">
            승
          </span>
        ) : null}
      </div>
      {oddsLabel ? (
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--accent)]">{oddsLabel}</p>
      ) : null}
      {poolAmount != null ? (
        <p className="mt-1 text-xs text-[var(--muted)]">배팅 합계 {poolAmount}P</p>
      ) : null}
    </div>
  );
}

function SetBetForm({
  set,
  draft,
  selectedOdds,
  submitting,
  onPick,
  onStakeChange,
  onSubmit,
}: {
  set: SetCard;
  draft: { pickedPlayerId: string; stake: number };
  selectedOdds: number;
  submitting: boolean;
  onPick: (playerId: string) => void;
  onStakeChange: (stake: number) => void;
  onSubmit: () => void;
}) {
  if (!set.homePlayer || !set.awayPlayer) return null;

  return (
    <div className="mt-4 space-y-4 border-t border-[var(--card-border)] pt-4">
      <div className="flex flex-wrap gap-2">
        {[set.homePlayer, set.awayPlayer].map((player) => {
          const selected = draft.pickedPlayerId === player.id;
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onPick(player.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
              }`}
            >
              {selected ? <CheckIcon /> : null}
              {player.nickname} 승
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block text-[var(--muted)]">배팅 포인트 (1~10P)</span>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.stake}
            onChange={(event) => onStakeChange(Number(event.target.value))}
            className={`${FORM_FIELD_CLASS} w-full`}
          />
        </label>
        <p className="text-sm text-[var(--muted)] sm:pb-2.5">
          예상 수익{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {estimatePayout(draft.stake, selectedOdds)}P
          </span>
        </p>
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="w-full rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "처리 중..." : "배팅하기"}
        </button>
      </div>
    </div>
  );
}

export function PredictBoard() {
  const [data, setData] = useState<PredictPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingSetId, setSubmittingSetId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { pickedPlayerId: string; stake: number }>>({});

  const applyPayload = useCallback((payload: PredictPayload) => {
    setData({
      ...payload,
      pointsLeaderboard: payload.pointsLeaderboard ?? [],
    });
    setDrafts((current) => {
      const next = { ...current };
      for (const match of payload.matches) {
        for (const set of match.sets) {
          if (!next[set.setId] && set.myBet) {
            next[set.setId] = {
              pickedPlayerId: set.myBet.pickedPlayerId,
              stake: set.myBet.stake,
            };
          } else if (!next[set.setId] && set.homePlayer) {
            next[set.setId] = {
              pickedPlayerId: set.homePlayer.id,
              stake: 1,
            };
          }
        }
      }
      return next;
    });
  }, []);

  const loadBoard = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/predict");
    if (!response.ok) {
      throw new Error("LOAD_FAILED");
    }
    const payload = (await response.json()) as PredictPayload;
    applyPayload(payload);
  }, [applyPayload]);

  useEffect(() => {
    loadBoard()
      .catch(() => setError("승부예측 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [loadBoard]);

  async function submitBet(match: MatchCard, set: SetCard) {
    if (!data?.loggedIn) {
      return;
    }

    const draft = drafts[set.setId];
    if (!draft?.pickedPlayerId) {
      setError("승리 선수를 선택해 주세요.");
      return;
    }

    setSubmittingSetId(set.setId);
    setError(null);

    try {
      const response = await fetch(`/api/predict/${set.setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickedPlayerId: draft.pickedPlayerId,
          stake: draft.stake,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "배팅에 실패했습니다.");
        return;
      }

      applyPayload({
        loggedIn: payload.loggedIn ?? true,
        previewMode: payload.previewMode,
        usingPreviewFallback: payload.usingPreviewFallback,
        boardMode: payload.boardMode,
        points: payload.points,
        pointsLeaderboard: payload.pointsLeaderboard ?? [],
        entryDayLabel: payload.entryDayLabel,
        matches: payload.matches,
      });
    } catch {
      setError("배팅에 실패했습니다.");
    } finally {
      setSubmittingSetId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">불러오는 중...</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (!data) {
    return null;
  }

  const isResultsBoard = data.boardMode === "results";

  return (
    <div className="space-y-5">
      {data.previewMode ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium">개발용 미리보기 모드</p>
          <p className="mt-1 text-amber-100/80">
            19:00 이전에도 UI를 확인할 수 있습니다.
            {data.usingPreviewFallback
              ? " 당일 엔트리 경기가 없어 다가오는 경기를 표시 중입니다."
              : " 로컬 개발 환경에서만 표시됩니다."}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">보유 포인트</p>
              <p className="text-3xl font-bold text-[var(--accent)]">
                {data.loggedIn ? `${data.points} P` : "—"}
              </p>
              {!data.loggedIn ? (
                <p className="mt-1 text-xs text-[var(--muted)]">로그인 후 내 보유 포인트가 표시됩니다.</p>
              ) : null}
            </div>
          </div>
          {data.entryDayLabel ? (
            <p className="text-sm text-[var(--muted)] sm:text-right">
              엔트리 일정: <span className="text-[var(--foreground)]">{data.entryDayLabel}</span>
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!data.loggedIn ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--muted)]">
          배팅하려면{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Discord 로그인
          </Link>
          이 필요합니다. 배당률과 세트 목록은 로그인 없이 볼 수 있습니다.
        </div>
      ) : null}

      {isResultsBoard ? (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
          <header className="mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">배팅 결과 · 보유포인트 순위</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              현재 지갑에 남아 있는 포인트 기준 전체 순위입니다.
            </p>
          </header>
          <WalletPointsLeaderboard rows={data.pointsLeaderboard} />
        </section>
      ) : data.matches.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          표시할 경기가 없습니다. 일정이 등록되면 이곳에 표시됩니다.
        </p>
      ) : (
        <div className="space-y-5">
          {data.matches.map((match) => {
            const isClosedBoard = data.boardMode === "closed";

            return (
              <article
                key={match.matchId}
                className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
              >
                <header className="border-b border-[var(--card-border)] px-5 py-4 text-center">
                  <p className="text-xs text-[var(--muted)]">
                    {match.week}주차 · {formatScheduleDate(match.scheduledAt)}
                  </p>
                  <p className="mt-2 text-xl font-bold sm:text-2xl">
                    <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
                    <span className="mx-3 text-base font-normal text-[var(--muted)]">vs</span>
                    <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
                  </p>
                  {isClosedBoard ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">배팅 마감 · 최종 배당</p>
                  ) : !match.predictionOpen ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {match.status === "COMPLETED"
                        ? "경기 종료"
                        : "19:00 엔트리 공개 이후, 경기 시작 전까지 배팅할 수 있습니다."}
                    </p>
                  ) : null}
                </header>

                <div className="divide-y divide-[var(--card-border)]">
                  {match.sets.map((set) => {
                    const draft = drafts[set.setId] ?? {
                      pickedPlayerId: set.myBet?.pickedPlayerId ?? set.homePlayer?.id ?? "",
                      stake: set.myBet?.stake ?? 1,
                    };
                    const selectedOdds =
                      set.homePlayer && draft.pickedPlayerId === set.homePlayer.id
                        ? set.odds.home
                        : set.awayPlayer && draft.pickedPlayerId === set.awayPlayer.id
                          ? set.odds.away
                          : set.odds.home;
                    const betLocked =
                      set.myBet?.status === "WON" ||
                      set.myBet?.status === "LOST" ||
                      set.myBet?.status === "REFUNDED";
                    const canBet =
                      data.loggedIn &&
                      set.predictionOpen &&
                      set.playersReady &&
                      !betLocked &&
                      !set.hasResult;

                    return (
                      <section key={set.setId} className="px-5 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-bold text-[var(--foreground)]">{set.orderIndex}세트</p>
                          {set.playersPublished ? (
                            <p className="text-xs font-medium text-[var(--muted)]">풀 {set.pools.total}P</p>
                          ) : null}
                        </div>

                        {!set.playersPublished ? (
                          <p className="text-sm text-[var(--muted)]">
                            19:00 이후 선수 및 배당이 공개됩니다.
                          </p>
                        ) : !set.playersReady ? (
                          <p className="text-sm text-[var(--muted)]">엔트리 미확정</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {set.homePlayer ? (
                              <PlayerDuelPanel
                                player={set.homePlayer}
                                teamColor={match.homeTeam.color}
                                oddsLabel={set.odds.homeLabel}
                                poolAmount={set.pools.home}
                              />
                            ) : null}
                            {set.awayPlayer ? (
                              <PlayerDuelPanel
                                player={set.awayPlayer}
                                teamColor={match.awayTeam.color}
                                oddsLabel={set.odds.awayLabel}
                                poolAmount={set.pools.away}
                              />
                            ) : null}
                          </div>
                        )}

                        {set.myBet ? (
                          <p
                            className={`mt-3 text-sm ${
                              set.myBet.status === "WON"
                                ? "font-medium text-[var(--accent)]"
                                : "text-[var(--muted)]"
                            }`}
                          >
                            내 배팅: {set.myBet.stake}P · {betStatusLabel(set.myBet.status)}
                            {set.myBet.payoutAmount != null && set.myBet.status === "WON"
                              ? ` · +${set.myBet.payoutAmount}P`
                              : ""}
                          </p>
                        ) : null}

                        {canBet ? (
                          <SetBetForm
                            set={set}
                            draft={draft}
                            selectedOdds={selectedOdds}
                            submitting={submittingSetId === set.setId}
                            onPick={(playerId) =>
                              setDrafts((current) => ({
                                ...current,
                                [set.setId]: { ...draft, pickedPlayerId: playerId },
                              }))
                            }
                            onStakeChange={(stake) =>
                              setDrafts((current) => ({
                                ...current,
                                [set.setId]: { ...draft, stake },
                              }))
                            }
                            onSubmit={() => submitBet(match, set)}
                          />
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
