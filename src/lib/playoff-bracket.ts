import {
  entryPublishContext,
  getSetEntryPlayers,
  isPublished,
  type EntrySlotPlayer,
} from "@/lib/entry";
import { formatScheduleDate } from "@/lib/match-display";
import { getTierBracketLabel } from "@/lib/tier-brackets";

export type PlayoffSlot =
  | { kind: "team"; name: string; color: string }
  | { kind: "placeholder"; label: string };

export type PlayoffMatchup = {
  id: string;
  label: string;
  home: PlayoffSlot;
  away: PlayoffSlot;
};

export type PlayoffSetRow = {
  orderIndex: number;
  tierLabel: string;
  mapName: string | null;
  homePlayerName: string | null;
  awayPlayerName: string | null;
};

export type PlayoffMatchupView = PlayoffMatchup & {
  matchId: string | null;
  scheduledLabel: string | null;
  sets: PlayoffSetRow[];
};

export type FinalsBracketView = {
  title: string;
  games: PlayoffMatchupView[];
};

const FINAL_HOME_NAME = "블로우잡";
const FINAL_HOME: PlayoffSlot = {
  kind: "team",
  name: FINAL_HOME_NAME,
  color: "#fb923c",
};

export type PlayoffDbMatch = {
  id: string;
  scheduledAt: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string; color: string };
  awayTeam: { name: string; color: string };
  sets: {
    id: string;
    orderIndex: number;
    tierBracket: string;
    mapName: string | null;
  }[];
  entry: {
    homeConfirmedAt: Date | null;
    awayConfirmedAt: Date | null;
    publishedAt: Date | null;
    slots: {
      teamId: string;
      setId: string;
      playerId: string;
      player: { nickname: string; tier: number; race: string };
    }[];
  } | null;
};

function teamName(slot: PlayoffSlot): string | null {
  return slot.kind === "team" ? slot.name : null;
}

function involvesBlowjob(match: PlayoffDbMatch) {
  return (
    match.homeTeam.name === FINAL_HOME_NAME || match.awayTeam.name === FINAL_HOME_NAME
  );
}

function findFinalMatches(matches: PlayoffDbMatch[]): PlayoffDbMatch[] {
  return [...matches]
    .filter(involvesBlowjob)
    .sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 2);
}

function resolveAwaySlot(dbMatch: PlayoffDbMatch): PlayoffSlot {
  const away =
    dbMatch.homeTeam.name === FINAL_HOME_NAME ? dbMatch.awayTeam : dbMatch.homeTeam;
  return { kind: "team", name: away.name, color: away.color };
}

function enrichFinalGame(
  gameNumber: 1 | 2,
  dbMatch: PlayoffDbMatch | undefined,
  awayFallback: PlayoffSlot,
): PlayoffMatchupView {
  const label = `결승 ${gameNumber}차전`;
  const template: PlayoffMatchup = {
    id: `final-g${gameNumber}`,
    label,
    home: FINAL_HOME,
    away: awayFallback,
  };

  if (!dbMatch) {
    return { ...template, matchId: null, scheduledLabel: null, sets: [] };
  }

  const homeName = teamName(FINAL_HOME);
  const homeIsDbHome = dbMatch.homeTeam.name === homeName;
  const homeTeam = homeIsDbHome ? dbMatch.homeTeam : dbMatch.awayTeam;
  const awayTeam = homeIsDbHome ? dbMatch.awayTeam : dbMatch.homeTeam;

  const published =
    dbMatch.entry && isPublished(entryPublishContext(dbMatch.entry, dbMatch))
      ? dbMatch.entry.slots.map(
          (slot): EntrySlotPlayer => ({
            teamId: slot.teamId,
            setId: slot.setId,
            playerId: slot.playerId,
            player: slot.player,
          }),
        )
      : null;

  const sets = [...dbMatch.sets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((set) => set.tierBracket !== "ACE")
    .map((set) => {
      const players = published
        ? getSetEntryPlayers(set.id, dbMatch.homeTeamId, dbMatch.awayTeamId, published)
        : { home: null, away: null };

      const homePlayer = homeIsDbHome ? players.home : players.away;
      const awayPlayer = homeIsDbHome ? players.away : players.home;

      return {
        orderIndex: set.orderIndex,
        tierLabel: getTierBracketLabel(set.tierBracket),
        mapName: set.mapName,
        homePlayerName: homePlayer?.nickname ?? null,
        awayPlayerName: awayPlayer?.nickname ?? null,
      };
    });

  return {
    ...template,
    home: { kind: "team", name: homeTeam.name, color: homeTeam.color },
    away: { kind: "team", name: awayTeam.name, color: awayTeam.color },
    matchId: dbMatch.id,
    scheduledLabel:
      dbMatch.scheduledAt != null ? formatScheduleDate(dbMatch.scheduledAt) : null,
    sets,
  };
}

/** @deprecated use buildFinalsBracketView */
export type PlayoffBracketView = FinalsBracketView;

export function buildFinalsBracketView(matches: PlayoffDbMatch[]): FinalsBracketView {
  const finalMatches = findFinalMatches(matches);
  const awayFromSchedule = finalMatches[0] ? resolveAwaySlot(finalMatches[0]) : null;
  const awayFallback: PlayoffSlot =
    awayFromSchedule ??
    ({ kind: "placeholder", label: "플레이오프 승자" } satisfies PlayoffSlot);

  return {
    title: "결승",
    games: [
      enrichFinalGame(1, finalMatches[0], awayFallback),
      enrichFinalGame(2, finalMatches[1], awayFallback),
    ],
  };
}

/** @deprecated use buildFinalsBracketView */
export function buildPlayoffBracketView(matches: PlayoffDbMatch[]): FinalsBracketView {
  return buildFinalsBracketView(matches);
}

/**
 * 엔트리·일정 등에서 쓸 라운드 라벨.
 * 결승 1·2차전은 블로우잡 포함 순위미반영 경기를 날짜순으로 구분합니다.
 */
export function getPlayoffRoundLabel(
  match: {
    id: string;
    countsTowardStandings: boolean;
    homeTeam: { name: string };
    awayTeam: { name: string };
  },
  seasonPlayoffMatches: {
    id: string;
    scheduledAt: Date | null;
    homeTeam: { name: string };
    awayTeam: { name: string };
  }[],
): string | null {
  if (match.countsTowardStandings) {
    return null;
  }

  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const isSemifinal =
    (home === "피나무라" && away === "언제나상한가") ||
    (home === "언제나상한가" && away === "피나무라");

  if (isSemifinal) {
    return "플레이오프";
  }

  const finalMatches = seasonPlayoffMatches
    .filter(
      (item) =>
        item.homeTeam.name === FINAL_HOME_NAME ||
        item.awayTeam.name === FINAL_HOME_NAME,
    )
    .sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const index = finalMatches.findIndex((item) => item.id === match.id);
  if (index >= 0) {
    return `결승 ${index + 1}차전`;
  }

  if (home === FINAL_HOME_NAME || away === FINAL_HOME_NAME) {
    return "결승";
  }

  return "플레이오프";
}
