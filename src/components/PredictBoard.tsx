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

type MatchCard = {
  matchId: string;
  week: number;
  round: number;
  scheduledAt: string | null;
  status: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  odds: {
    home: number;
    away: number;
    homeLabel: string;
    awayLabel: string;
  };
  pools: { home: number; away: number; total: number };
  predictionOpen: boolean;
  myBet: {
    pickedTeamId: string;
    stake: number;
    status: string;
    payoutAmount: number | null;
  } | null;
};

type PredictPayload = {
  loggedIn: boolean;
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

export function PredictBoard() {
  const [data, setData] = useState<PredictPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { pickedTeamId: string; stake: number }>>({});

  const loadBoard = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/predict");
    if (!response.ok) {
      throw new Error("LOAD_FAILED");
    }
    const payload = (await response.json()) as PredictPayload;
    setData(payload);
    setDrafts((current) => {
      const next = { ...current };
      for (const match of payload.matches) {
        if (!next[match.matchId] && match.myBet) {
          next[match.matchId] = {
            pickedTeamId: match.myBet.pickedTeamId,
            stake: match.myBet.stake,
          };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    loadBoard()
      .catch(() => setError("승부예측 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [loadBoard]);

  async function submitBet(match: MatchCard) {
    if (!data?.loggedIn) {
      return;
    }

    const draft = drafts[match.matchId];
    if (!draft?.pickedTeamId) {
      setError("승리 팀을 선택해 주세요.");
      return;
    }

    setSubmittingMatchId(match.matchId);
    setError(null);

    try {
      const response = await fetch(`/api/predict/${match.matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickedTeamId: draft.pickedTeamId,
          stake: draft.stake,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "배팅에 실패했습니다.");
        return;
      }

      setData({
        loggedIn: true,
        points: payload.points,
        entryDayLabel: payload.entryDayLabel,
        matches: payload.matches,
      });
    } catch {
      setError("배팅에 실패했습니다.");
    } finally {
      setSubmittingMatchId(null);
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
          이 필요합니다. 배당률과 경기 목록은 로그인 없이 볼 수 있습니다.
        </div>
      ) : null}

      {data.matches.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          오늘 엔트리 대상 경기가 없습니다. 일정이 등록되면 이곳에 표시됩니다.
        </p>
      ) : (
        <div className="space-y-4">
          {data.matches.map((match) => {
            const draft = drafts[match.matchId] ?? {
              pickedTeamId: match.myBet?.pickedTeamId ?? match.homeTeam.id,
              stake: match.myBet?.stake ?? 1,
            };
            const selectedOdds =
              draft.pickedTeamId === match.homeTeam.id ? match.odds.home : match.odds.away;
            const canBet = data.loggedIn && match.predictionOpen && match.myBet?.status !== "WON" && match.myBet?.status !== "LOST" && match.myBet?.status !== "REFUNDED";

            return (
              <article
                key={match.matchId}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="text-sm text-[var(--muted)]">
                    풀 {match.pools.total}P
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--card-border)] bg-white/5 p-3">
                    <p className="text-sm font-medium" style={{ color: match.homeTeam.color }}>
                      {match.homeTeam.name}
                    </p>
                    <p className="mt-1 text-lg font-bold text-[var(--accent)]">{match.odds.homeLabel}</p>
                    <p className="text-xs text-[var(--muted)]">배팅 합계 {match.pools.home}P</p>
                  </div>
                  <div className="rounded-lg border border-[var(--card-border)] bg-white/5 p-3">
                    <p className="text-sm font-medium" style={{ color: match.awayTeam.color }}>
                      {match.awayTeam.name}
                    </p>
                    <p className="mt-1 text-lg font-bold text-[var(--accent)]">{match.odds.awayLabel}</p>
                    <p className="text-xs text-[var(--muted)]">배팅 합계 {match.pools.away}P</p>
                  </div>
                </div>

                {match.myBet ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    내 배팅: {match.myBet.stake}P · {betStatusLabel(match.myBet.status)}
                    {match.myBet.payoutAmount != null && match.myBet.status === "WON"
                      ? ` · +${match.myBet.payoutAmount}P`
                      : ""}
                  </p>
                ) : null}

                {!match.predictionOpen ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {match.status === "COMPLETED"
                      ? "경기 종료"
                      : "19:00 엔트리 공개 이후, 경기 시작 전까지 배팅할 수 있습니다."}
                  </p>
                ) : null}

                {canBet ? (
                  <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4">
                    <div className="flex flex-wrap gap-2">
                      {[match.homeTeam, match.awayTeam].map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [match.matchId]: { ...draft, pickedTeamId: team.id },
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-sm transition ${
                            draft.pickedTeamId === team.id
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                              : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]"
                          }`}
                        >
                          {team.name} 승
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
                              [match.matchId]: {
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
                        disabled={submittingMatchId === match.matchId}
                        onClick={() => submitBet(match)}
                        className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50"
                      >
                        {submittingMatchId === match.matchId ? "처리 중..." : "배팅하기"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
