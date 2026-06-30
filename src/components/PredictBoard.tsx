"use client";

import { FORM_FIELD_CLASS } from "@/lib/form-styles";
import { estimatePayout } from "@/lib/prediction-odds";
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

type PredictPayload = {
  loggedIn: boolean;
  previewMode?: boolean;
  usingPreviewFallback?: boolean;
  boardMode?: "results" | "upcoming";
  points: number;
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

export function PredictBoard() {
  const [data, setData] = useState<PredictPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingSetId, setSubmittingSetId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { pickedPlayerId: string; stake: number }>>({});

  const applyPayload = useCallback((payload: PredictPayload) => {
    setData(payload);
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

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">보유 포인트</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{data.points} P</p>
        </div>
        {data.entryDayLabel ? (
          <p className="text-sm text-[var(--muted)]">엔트리 일정: {data.entryDayLabel}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!data.loggedIn ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          배팅하려면{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Discord 로그인
          </Link>
          이 필요합니다. 배당률과 세트 목록은 로그인 없이 볼 수 있습니다.
        </div>
      ) : null}

      {data.matches.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          표시할 경기가 없습니다. 일정이 등록되면 이곳에 표시됩니다.
        </p>
      ) : (
        <div className="space-y-4">
          {data.matches.map((match) => {
            const isResultsBoard = data.boardMode === "results";

            return (
            <article
              key={match.matchId}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-[var(--muted)]">
                    {match.week}주차 · {formatScheduleDate(match.scheduledAt)}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
                    <span className="mx-2 text-[var(--muted)]">vs</span>
                    <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
                  </p>
                </div>
                {isResultsBoard ? (
                  <p className="text-sm text-[var(--muted)]">경기 종료 · 배팅 결과</p>
                ) : !match.predictionOpen ? (
                  <p className="text-sm text-[var(--muted)]">
                    {match.status === "COMPLETED"
                      ? "경기 종료"
                      : "19:00 엔트리 공개 이후, 경기 시작 전까지 배팅할 수 있습니다."}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
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
                    !isResultsBoard &&
                    data.loggedIn &&
                    set.predictionOpen &&
                    set.playersReady &&
                    !betLocked &&
                    !set.hasResult;

                  return (
                    <div
                      key={set.setId}
                      className="rounded-lg border border-[var(--card-border)] bg-white/5 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">{set.orderIndex}세트</p>
                        {set.playersPublished && !isResultsBoard ? (
                          <p className="text-xs text-[var(--muted)]">풀 {set.pools.total}P</p>
                        ) : null}
                      </div>

                      {isResultsBoard ? (
                        <>
                          {!set.playersReady ? (
                            <p className="mt-2 text-sm text-[var(--muted)]">엔트리 정보 없음</p>
                          ) : (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {set.homePlayer ? (
                                <div
                                  className={`rounded-lg border bg-[var(--card)] p-3 ${
                                    set.winnerPlayer?.id === set.homePlayer.id
                                      ? "border-[var(--accent)]"
                                      : "border-[var(--card-border)]"
                                  }`}
                                >
                                  <p
                                    className="text-sm font-medium"
                                    style={{ color: match.homeTeam.color }}
                                  >
                                    {playerLabel(set.homePlayer)}
                                  </p>
                                  {set.winnerPlayer?.id === set.homePlayer.id ? (
                                    <p className="mt-1 text-sm font-semibold text-[var(--accent)]">승</p>
                                  ) : null}
                                </div>
                              ) : null}
                              {set.awayPlayer ? (
                                <div
                                  className={`rounded-lg border bg-[var(--card)] p-3 ${
                                    set.winnerPlayer?.id === set.awayPlayer.id
                                      ? "border-[var(--accent)]"
                                      : "border-[var(--card-border)]"
                                  }`}
                                >
                                  <p
                                    className="text-sm font-medium"
                                    style={{ color: match.awayTeam.color }}
                                  >
                                    {playerLabel(set.awayPlayer)}
                                  </p>
                                  {set.winnerPlayer?.id === set.awayPlayer.id ? (
                                    <p className="mt-1 text-sm font-semibold text-[var(--accent)]">승</p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          )}
                          {set.winnerPlayer ? (
                            <p className="mt-2 text-sm text-[var(--muted)]">
                              승자: {set.winnerPlayer.nickname}
                            </p>
                          ) : null}
                        </>
                      ) : !set.playersPublished ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          19:00 이후 선수 및 배당이 공개됩니다.
                        </p>
                      ) : !set.playersReady ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">엔트리 미확정</p>
                      ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {set.homePlayer ? (
                            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                              <p
                                className="text-sm font-medium"
                                style={{ color: match.homeTeam.color }}
                              >
                                {playerLabel(set.homePlayer)}
                              </p>
                              <p className="mt-1 text-lg font-bold text-[var(--accent)]">
                                {set.odds.homeLabel}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                배팅 합계 {set.pools.home}P
                              </p>
                            </div>
                          ) : null}
                          {set.awayPlayer ? (
                            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                              <p
                                className="text-sm font-medium"
                                style={{ color: match.awayTeam.color }}
                              >
                                {playerLabel(set.awayPlayer)}
                              </p>
                              <p className="mt-1 text-lg font-bold text-[var(--accent)]">
                                {set.odds.awayLabel}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                배팅 합계 {set.pools.away}P
                              </p>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {set.myBet ? (
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          내 배팅: {set.myBet.stake}P · {betStatusLabel(set.myBet.status)}
                          {set.myBet.payoutAmount != null && set.myBet.status === "WON"
                            ? ` · +${set.myBet.payoutAmount}P`
                            : ""}
                        </p>
                      ) : null}

                      {canBet && set.homePlayer && set.awayPlayer ? (
                        <div className="mt-3 space-y-3 border-t border-[var(--card-border)] pt-3">
                          <div className="flex flex-wrap gap-2">
                            {[set.homePlayer, set.awayPlayer].map((player) => (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [set.setId]: { ...draft, pickedPlayerId: player.id },
                                  }))
                                }
                                className={`rounded-lg border px-3 py-2 text-sm transition ${
                                  draft.pickedPlayerId === player.id
                                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                                    : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]"
                                }`}
                              >
                                {player.nickname} 승
                              </button>
                            ))}
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="flex-1 text-sm">
                              <span className="mb-1 block text-[var(--muted)]">배팅 포인트 (1~10P)</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={draft.stake}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [set.setId]: {
                                      ...draft,
                                      stake: Number(event.target.value),
                                    },
                                  }))
                                }
                                className={`${FORM_FIELD_CLASS} w-full`}
                              />
                            </label>
                            <div className="text-sm text-[var(--muted)]">
                              예상 수익 {estimatePayout(draft.stake, selectedOdds)}P
                            </div>
                            <button
                              type="button"
                              disabled={submittingSetId === set.setId}
                              onClick={() => submitBet(match, set)}
                              className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50"
                            >
                              {submittingSetId === set.setId ? "처리 중..." : "배팅하기"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
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
