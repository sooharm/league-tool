"use client";

import {
  formatScheduleDate,
  getBjNameGlowStyle,
  getMatchPointsBreakdown,
  getMatchSetScore,
  getMatchWinner,
  getTierBracketLabel,
  type CompletedMatch,
} from "@/lib/match-display";
import type { ResultInputStatus } from "@/lib/results";
import type { MatchWithResults } from "@/lib/standings";
import Link from "next/link";
import { useState } from "react";

function getSetResultSides(
  result: NonNullable<CompletedMatch["sets"][number]["result"]>,
  match: CompletedMatch,
) {
  const homeWon = result.winnerTeamId === match.homeTeamId;

  if (result.isForfeit) {
    return {
      home: {
        nickname: homeWon ? result.winnerPlayer.nickname : "기권",
        label: homeWon ? "기권승" : "기권",
        color: match.homeTeam.color,
      },
      away: {
        nickname: homeWon ? "기권" : result.winnerPlayer.nickname,
        label: homeWon ? "기권" : "기권승",
        color: match.awayTeam.color,
      },
    };
  }

  return {
    home: {
      nickname: homeWon ? result.winnerPlayer.nickname : result.loserPlayer!.nickname,
      label: homeWon ? "W" : "L",
      color: match.homeTeam.color,
    },
    away: {
      nickname: homeWon ? result.loserPlayer!.nickname : result.winnerPlayer.nickname,
      label: homeWon ? "L" : "W",
      color: match.awayTeam.color,
    },
  };
}

function statusBadgeClass(status: ResultInputStatus) {
  if (status === "complete") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "partial") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }
  return "border-[var(--card-border)] bg-black/20 text-[var(--muted)]";
}

export function MatchResultItem({
  match,
  status,
  statusLabel,
}: {
  match: CompletedMatch;
  status: ResultInputStatus;
  statusLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const stats = match as unknown as MatchWithResults;
  const homeSets = getMatchSetScore(stats, match.homeTeamId);
  const awaySets = getMatchSetScore(stats, match.awayTeamId);
  const winnerId = getMatchWinner(stats);
  const points = getMatchPointsBreakdown(stats);
  const completedSets = match.sets.filter((set) => set.result);
  const hasResults = completedSets.length > 0;
  const hasScore = homeSets.wins + awaySets.wins > 0;
  const scheduledAt = match.scheduledAt ? new Date(match.scheduledAt) : null;
  const bjDisplayStyle = match.bjName ? getBjNameGlowStyle(match.bjName) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-black/10"
      >
        <span className="flex flex-wrap items-center gap-x-2 text-lg font-bold">
          <span className="mr-4 text-sm font-normal text-[var(--muted)]">
            {formatScheduleDate(scheduledAt)}
          </span>
          <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
          {hasScore ? (
            <span className="text-base font-semibold text-[var(--foreground)]">
              {homeSets.wins}:{awaySets.wins}
            </span>
          ) : (
            <span className="text-base text-[var(--muted)]">vs</span>
          )}
          <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
        </span>
        <div className="flex items-center gap-2 text-sm">
          {match.bjName && bjDisplayStyle ? (
            <span className="inline-flex items-baseline gap-0.5 font-mono text-sm">
              <span
                className="font-extrabold uppercase tracking-[0.12em]"
                style={bjDisplayStyle}
              >
                BJ:
              </span>
              <span className="font-bold normal-case tracking-normal" style={bjDisplayStyle}>
                {match.bjName}
              </span>
            </span>
          ) : null}
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs ${statusBadgeClass(status)}`}
          >
            {statusLabel}
          </span>
          <span
            className={`inline-block text-xs text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▼
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--card-border)] px-4 py-3">
          {hasResults ? (
            <>
              {winnerId ? (
                <p className="text-sm text-[var(--accent)]">
                  승리:{" "}
                  {winnerId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name}
                </p>
              ) : null}

              <ul className="mt-3 space-y-1 text-sm">
                {completedSets.map((set) => (
                  <li key={set.id} className="text-[var(--muted)]">
                    <span className="text-[var(--foreground)]">
                      {getTierBracketLabel(set.tierBracket)}
                    </span>
                    {set.mapName ? ` · ${set.mapName}` : ""}
                    {set.result ? (
                      <>
                        {" · "}
                        {(() => {
                          const sides = getSetResultSides(set.result, match);
                          return (
                            <>
                              <span style={{ color: sides.home.color }}>
                                {sides.home.nickname}
                              </span>{" "}
                              {sides.home.label} vs{" "}
                              <span style={{ color: sides.away.color }}>
                                {sides.away.nickname}
                              </span>{" "}
                              {sides.away.label}
                            </>
                          );
                        })()}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>

              {winnerId ? (
                <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                  <p>
                    <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
                    {" "}+{points.home.total}점
                    {points.home.labels.length > 0
                      ? ` (${points.home.labels.join(", ")})`
                      : ""}
                  </p>
                  <p>
                    <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
                    {" "}+{points.away.total}점
                    {points.away.labels.length > 0
                      ? ` (${points.away.labels.join(", ")})`
                      : ""}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">아직 입력된 세트 결과가 없습니다.</p>
          )}

          <Link
            href={`/results/${match.id}`}
            className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            {hasResults ? "결과 수정 →" : "결과 입력 →"}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
