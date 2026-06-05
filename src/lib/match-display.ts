import { resolvePublishedEntrySlotsForMatch, teamHasSixManBonus } from "@/lib/entry";
import type { Player, Set, SetResult, Team } from "@prisma/client";
import {
  calculateMatchPoints,
  getMatchSetScore,
  getMatchWinner,
  getTierBracketLabel,
  hasAceSet,
  aceLoserTeamId,
  POINTS,
  type MatchWithResults,
} from "@/lib/standings";

export type CompletedMatch = {
  id: string;
  week: number;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date | null;
  bjName: string | null;
  vodUrl: string | null;
  sixManEntryHome: boolean;
  sixManEntryAway: boolean;
  homeTeam: Team;
  awayTeam: Team;
  sets: (Set & {
    result:
      | (SetResult & {
          winnerPlayer: Player;
          loserPlayer: Player;
        })
      | null;
  })[];
};

const KOREA_TZ = "Asia/Seoul";

function getKoreaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TZ,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);

  return {
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

export function formatMatchDate(date: Date | null) {
  if (!date) return "-";
  const { month, day } = getKoreaDateParts(date);
  return `${month}/${day}`;
}

export function formatScheduleDate(date: Date | null) {
  if (!date) return "-";
  const { month, day, weekday } = getKoreaDateParts(date);
  return `${month}/${day} (${weekday})`;
}

export function isMatchCompleted(match: { sets: { result: unknown }[] }) {
  return match.sets.some((set) => set.result !== null);
}

export function groupMatchesByWeek<T extends { week: number }>(matches: T[]) {
  return matches.reduce<Record<number, T[]>>((acc, match) => {
    acc[match.week] ??= [];
    acc[match.week].push(match);
    return acc;
  }, {});
}

type PointsBreakdown = {
  total: number;
  labels: string[];
};

function buildTeamPointsBreakdown(
  match: MatchWithResults,
  teamId: string,
  total: number,
  isWinner: boolean,
) {
  const labels: string[] = [];
  const winnerId = getMatchWinner(match);
  if (!winnerId) return { total, labels };

  const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  const winnerScore = getMatchSetScore(match, winnerId);
  const loserScore = getMatchSetScore(match, loserId);

  if (isWinner) {
    labels.push(`승리+${POINTS.matchWin}`);
  }

  if (teamHasSixManBonus(match, teamId, resolvePublishedEntrySlotsForMatch(match))) {
    labels.push(`6인엔트리+${POINTS.sixManEntry}`);
  }

  if (hasAceSet(match) && aceLoserTeamId(match) === teamId) {
    labels.push(`에결패배+${POINTS.aceLossBonus}`);
  }

  if (isWinner && loserScore.wins === 0 && winnerScore.wins >= 6) {
    labels.push(`6:0완승+${POINTS.cleanSweep}`);
  }

  return { total, labels };
}

export function getMatchPointsBreakdown(match: MatchWithResults | CompletedMatch): {
  home: PointsBreakdown;
  away: PointsBreakdown;
} {
  const stats = match as MatchWithResults;
  const winnerId = getMatchWinner(stats);
  const points = calculateMatchPoints(stats);

  if (!winnerId) {
    return {
      home: { total: 0, labels: [] },
      away: { total: 0, labels: [] },
    };
  }

  return {
    home: buildTeamPointsBreakdown(
      stats,
      match.homeTeamId,
      points.home,
      winnerId === match.homeTeamId,
    ),
    away: buildTeamPointsBreakdown(
      stats,
      match.awayTeamId,
      points.away,
      winnerId === match.awayTeamId,
    ),
  };
}

function hashBjName(bjName: string, seed = 0) {
  const normalized = bjName.trim().toLowerCase();
  let hash = seed;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getBjNameColor(bjName: string) {
  const hash = hashBjName(bjName);
  const hash2 = hashBjName(bjName, 5381);
  const hue = (hash * 137.508) % 360;
  const saturation = 68 + (hash2 % 22);
  const lightness = 58 + ((hash2 >> 8) % 16);

  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
}

export function getBjNameGlowStyle(bjName: string): { color: string; textShadow: string } {
  const hash = hashBjName(bjName);
  const hash2 = hashBjName(bjName, 5381);
  const hue = (hash * 137.508) % 360;
  const saturation = 68 + (hash2 % 22);
  const lightness = 58 + ((hash2 >> 8) % 16);
  const color = `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
  const glow = `hsla(${hue.toFixed(1)}, ${saturation}%, ${lightness}%, 0.55)`;

  return {
    color,
    textShadow: `0 0 10px ${glow}`,
  };
}

export { getMatchSetScore, getMatchWinner, getTierBracketLabel };
