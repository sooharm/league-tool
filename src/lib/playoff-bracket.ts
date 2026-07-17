import {
  entryPublishContext,
  getSetEntryPlayers,
  isPublished,
  type EntrySlotPlayer,
} from "@/lib/entry";
import { formatScheduleDate, getMatchSetScore, getMatchWinner } from "@/lib/match-display";
import type { MatchWithResults } from "@/lib/standings";
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
  homeLabel: string | null;
  awayLabel: string | null;
  source: "result" | "entry" | "pending";
};

export type PlayoffMatchupView = PlayoffMatchup & {
  matchId: string | null;
  scheduledLabel: string | null;
  setScore: { home: number; away: number } | null;
  winnerSide: "home" | "away" | null;
  sets: PlayoffSetRow[];
};

export type FinalsBracketView = {
  title: string;
  games: PlayoffMatchupView[];
  superAce: SuperAceView | null;
  champion: PlayoffSlot | null;
  seriesRecord: { wins: number; losses: number } | null;
  isComplete: boolean;
};

export type SuperAceView = {
  matchId: string | null;
  scheduledLabel: string | null;
  mapName: string | null;
  homePlayerName: string;
  awayPlayerName: string;
  homeLabel: string;
  awayLabel: string;
  winnerPlayerName: string;
  winnerTeamName: string;
  winnerTeamColor: string;
  homeTeamColor: string;
  awayTeamColor: string;
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
  week?: number;
  countsTowardStandings?: boolean;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string; color: string };
  awayTeam: { name: string; color: string };
  sets: {
    id: string;
    orderIndex: number;
    tierBracket: string;
    mapName: string | null;
    result: {
      winnerTeamId: string;
      loserTeamId: string;
      isForfeit: boolean;
      winnerPlayer: { nickname: string };
      loserPlayer: { nickname: string } | null;
    } | null;
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

function sortByScheduledAt(a: PlayoffDbMatch, b: PlayoffDbMatch) {
  const aTime = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function sameTeamPair(a: PlayoffDbMatch, b: PlayoffDbMatch) {
  const teamIds = new Set([a.homeTeamId, a.awayTeamId]);
  return teamIds.has(b.homeTeamId) && teamIds.has(b.awayTeamId);
}

function hasSetResults(match: PlayoffDbMatch) {
  return match.sets.some((set) => set.result != null);
}

function isAceOnlyDecider(match: PlayoffDbMatch) {
  const completed = match.sets.filter((set) => set.result != null);
  return completed.length > 0 && completed.every((set) => set.tierBracket === "ACE");
}

function championSlotFromGame(game: PlayoffMatchupView): PlayoffSlot | null {
  const winner = getGameWinnerName(game);
  if (!winner) {
    return null;
  }

  const slot = winner === FINAL_HOME_NAME ? game.home : game.away;
  return slot.kind === "team" ? slot : null;
}

/** 시즌 전체 경기에서 결승 1·2차전을 날짜순으로 고릅니다. */
export function pickFinalMatchesFromSeason(matches: PlayoffDbMatch[]): PlayoffDbMatch[] {
  const playoffBlowjob = matches
    .filter((match) => match.countsTowardStandings === false && involvesBlowjob(match))
    .sort(sortByScheduledAt);

  if (playoffBlowjob.length >= 2) {
    return playoffBlowjob.slice(0, 2);
  }

  if (playoffBlowjob.length === 0) {
    return [];
  }

  const game1 = playoffBlowjob[0]!;
  const game1Time = game1.scheduledAt?.getTime() ?? 0;

  const finalsPairing = matches
    .filter(
      (match) =>
        involvesBlowjob(match) &&
        sameTeamPair(match, game1) &&
        hasSetResults(match) &&
        (match.scheduledAt?.getTime() ?? 0) >= game1Time,
    )
    .sort(sortByScheduledAt);

  if (finalsPairing.length >= 2) {
    return finalsPairing.slice(-2);
  }

  const samePairing = matches
    .filter((match) => match.id !== game1.id && sameTeamPair(match, game1))
    .sort(sortByScheduledAt);

  const game2 =
    samePairing.find(
      (match) =>
        !hasSetResults(match) &&
        match.scheduledAt != null &&
        match.scheduledAt.getTime() >= game1Time,
    ) ??
    samePairing.find((match) => !hasSetResults(match)) ??
    samePairing.find(
      (match) =>
        match.scheduledAt != null && match.scheduledAt.getTime() > game1Time,
    ) ??
    samePairing[0];

  if (!game2) {
    return [game1];
  }

  return [game1, game2].sort(sortByScheduledAt);
}

/** 결승 1·2차전 이후 같은 대진의 슈퍼에이스결정전 경기 */
export function pickSuperAceMatch(
  matches: PlayoffDbMatch[],
  finalGames: PlayoffDbMatch[],
): PlayoffDbMatch | null {
  const finalIds = new Set(finalGames.map((match) => match.id));
  const anchor = finalGames[0];
  if (!anchor || finalGames.length < 2) {
    return null;
  }

  const lastFinal = finalGames[finalGames.length - 1]!;
  const lastFinalTime = lastFinal.scheduledAt?.getTime() ?? 0;

  const candidates = matches
    .filter(
      (match) =>
        !finalIds.has(match.id) &&
        involvesBlowjob(match) &&
        sameTeamPair(match, anchor),
    )
    .filter((match) => {
      if (!hasSetResults(match)) {
        return false;
      }

      if (isAceOnlyDecider(match)) {
        return true;
      }

      const matchTime = match.scheduledAt?.getTime() ?? 0;
      return match.countsTowardStandings === false && matchTime > lastFinalTime;
    })
    .sort(sortByScheduledAt);

  return candidates.at(-1) ?? null;
}

function getGameWinnerName(game: PlayoffMatchupView): string | null {
  if (!game.winnerSide) {
    return null;
  }

  const slot = game.winnerSide === "home" ? game.home : game.away;
  return slot.kind === "team" ? slot.name : null;
}

function resolveChampion(
  game1: PlayoffMatchupView,
  game2: PlayoffMatchupView,
  superAce: SuperAceView | null,
): PlayoffSlot | null {
  const game1Winner = getGameWinnerName(game1);
  const game2Winner = getGameWinnerName(game2);

  if (!game1Winner || !game2Winner) {
    return null;
  }

  if (game1Winner === game2Winner) {
    return championSlotFromGame(game1);
  }

  if (superAce) {
    return {
      kind: "team",
      name: superAce.winnerTeamName,
      color: superAce.winnerTeamColor,
    };
  }

  // 1:1 동점 — 슈퍼에이스 별도 경기가 없으면 2차전 승자를 우승으로 표시
  return championSlotFromGame(game2);
}

function computeSeriesRecord(
  game1: PlayoffMatchupView,
  game2: PlayoffMatchupView,
): { wins: number; losses: number } | null {
  let wins = 0;
  let losses = 0;

  for (const game of [game1, game2]) {
    const winner = getGameWinnerName(game);
    if (winner === FINAL_HOME_NAME) {
      wins += 1;
    } else if (winner) {
      losses += 1;
    }
  }

  if (wins + losses === 0) {
    return null;
  }

  return { wins, losses };
}

function getFinaleSuperAceFallback(
  game1: PlayoffMatchupView,
  game2: PlayoffMatchupView,
): SuperAceView | null {
  const game1Winner = getGameWinnerName(game1);
  const game2Winner = getGameWinnerName(game2);

  if (!game1Winner || !game2Winner || game1Winner === game2Winner) {
    return null;
  }

  const blowjobColor =
    game1.home.kind === "team" && game1.home.name === FINAL_HOME_NAME
      ? game1.home.color
      : game1.away.kind === "team"
        ? game1.away.color
        : "#fb923c";
  const opponentColor =
    game1.home.kind === "team" && game1.home.name !== FINAL_HOME_NAME
      ? game1.home.color
      : game1.away.kind === "team" && game1.away.name !== FINAL_HOME_NAME
        ? game1.away.color
        : "#a78bfa";

  return {
    matchId: null,
    scheduledLabel: null,
    mapName: null,
    homePlayerName: "BingByuk",
    awayPlayerName: "Sunbi",
    homeLabel: "W",
    awayLabel: "L",
    winnerPlayerName: "BingByuk",
    winnerTeamName: FINAL_HOME_NAME,
    winnerTeamColor: blowjobColor,
    homeTeamColor: blowjobColor,
    awayTeamColor: opponentColor,
  };
}

function enrichSuperAce(dbMatch: PlayoffDbMatch | null): SuperAceView | null {
  if (!dbMatch) {
    return null;
  }

  const aceSet = dbMatch.sets.find((set) => set.tierBracket === "ACE" && set.result);
  if (!aceSet?.result) {
    return null;
  }

  const sides = getSetResultSides(aceSet.result, dbMatch);
  const winnerTeam =
    aceSet.result.winnerTeamId === dbMatch.homeTeamId
      ? dbMatch.homeTeam
      : dbMatch.awayTeam;

  return {
    matchId: dbMatch.id,
    scheduledLabel:
      dbMatch.scheduledAt != null ? formatScheduleDate(dbMatch.scheduledAt) : null,
    mapName: aceSet.mapName,
    homePlayerName: sides.homePlayerName,
    awayPlayerName: sides.awayPlayerName,
    homeLabel: sides.homeLabel,
    awayLabel: sides.awayLabel,
    winnerPlayerName: aceSet.result.winnerPlayer.nickname,
    winnerTeamName: winnerTeam.name,
    winnerTeamColor: winnerTeam.color,
    homeTeamColor: dbMatch.homeTeam.color,
    awayTeamColor: dbMatch.awayTeam.color,
  };
}

function resolveAwaySlot(dbMatch: PlayoffDbMatch): PlayoffSlot {
  const away =
    dbMatch.homeTeam.name === FINAL_HOME_NAME ? dbMatch.awayTeam : dbMatch.homeTeam;
  return { kind: "team", name: away.name, color: away.color };
}

type SetResultSides = {
  homePlayerName: string;
  awayPlayerName: string;
  homeLabel: string;
  awayLabel: string;
};

function getSetResultSides(
  result: NonNullable<PlayoffDbMatch["sets"][number]["result"]>,
  dbMatch: PlayoffDbMatch,
): SetResultSides {
  const homeWon = result.winnerTeamId === dbMatch.homeTeamId;

  if (result.isForfeit) {
    return {
      homePlayerName: homeWon ? result.winnerPlayer.nickname : "기권",
      homeLabel: homeWon ? "기권승" : "기권",
      awayPlayerName: homeWon ? "기권" : result.winnerPlayer.nickname,
      awayLabel: homeWon ? "기권" : "기권승",
    };
  }

  return {
    homePlayerName: homeWon
      ? result.winnerPlayer.nickname
      : result.loserPlayer!.nickname,
    homeLabel: homeWon ? "W" : "L",
    awayPlayerName: homeWon
      ? result.loserPlayer!.nickname
      : result.winnerPlayer.nickname,
    awayLabel: homeWon ? "L" : "W",
  };
}

function orientSetSides(
  sides: SetResultSides,
  homeIsDbHome: boolean,
): SetResultSides {
  if (homeIsDbHome) {
    return sides;
  }

  return {
    homePlayerName: sides.awayPlayerName,
    homeLabel: sides.awayLabel,
    awayPlayerName: sides.homePlayerName,
    awayLabel: sides.homeLabel,
  };
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

  const emptyView: PlayoffMatchupView = {
    ...template,
    matchId: null,
    scheduledLabel: null,
    setScore: null,
    winnerSide: null,
    sets: [],
  };

  if (!dbMatch) {
    return emptyView;
  }

  const homeName = teamName(FINAL_HOME);
  const homeIsDbHome = homeName != null && dbMatch.homeTeam.name === homeName;
  const homeTeam = homeIsDbHome ? dbMatch.homeTeam : dbMatch.awayTeam;
  const awayTeam = homeIsDbHome ? dbMatch.awayTeam : dbMatch.homeTeam;
  const displayHomeTeamId = homeIsDbHome ? dbMatch.homeTeamId : dbMatch.awayTeamId;
  const displayAwayTeamId = homeIsDbHome ? dbMatch.awayTeamId : dbMatch.homeTeamId;

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
    .map((set) => {
      if (set.result) {
        const sides = orientSetSides(getSetResultSides(set.result, dbMatch), homeIsDbHome);
        return {
          orderIndex: set.orderIndex,
          tierLabel: getTierBracketLabel(set.tierBracket),
          mapName: set.mapName,
          homePlayerName: sides.homePlayerName,
          awayPlayerName: sides.awayPlayerName,
          homeLabel: sides.homeLabel,
          awayLabel: sides.awayLabel,
          source: "result" as const,
        };
      }

      const players = published
        ? getSetEntryPlayers(set.id, dbMatch.homeTeamId, dbMatch.awayTeamId, published)
        : { home: null, away: null };

      const homePlayer = homeIsDbHome ? players.home : players.away;
      const awayPlayer = homeIsDbHome ? players.away : players.home;

      if (homePlayer || awayPlayer) {
        return {
          orderIndex: set.orderIndex,
          tierLabel: getTierBracketLabel(set.tierBracket),
          mapName: set.mapName,
          homePlayerName: homePlayer?.nickname ?? null,
          awayPlayerName: awayPlayer?.nickname ?? null,
          homeLabel: null,
          awayLabel: null,
          source: "entry" as const,
        };
      }

      return {
        orderIndex: set.orderIndex,
        tierLabel: getTierBracketLabel(set.tierBracket),
        mapName: set.mapName,
        homePlayerName: null,
        awayPlayerName: null,
        homeLabel: null,
        awayLabel: null,
        source: "pending" as const,
      };
    });

  const completedSets = sets.filter((set) => set.source === "result");
  const setsToShow = completedSets.length > 0 ? completedSets : sets;

  const stats = dbMatch as unknown as MatchWithResults;
  const hasScore = completedSets.length > 0;
  const homeWins = hasScore ? getMatchSetScore(stats, displayHomeTeamId).wins : 0;
  const awayWins = hasScore ? getMatchSetScore(stats, displayAwayTeamId).wins : 0;
  const winnerTeamId = hasScore ? getMatchWinner(stats) : null;
  let winnerSide: "home" | "away" | null = null;
  if (winnerTeamId === displayHomeTeamId) winnerSide = "home";
  if (winnerTeamId === displayAwayTeamId) winnerSide = "away";

  return {
    ...template,
    home: { kind: "team", name: homeTeam.name, color: homeTeam.color },
    away: { kind: "team", name: awayTeam.name, color: awayTeam.color },
    matchId: dbMatch.id,
    scheduledLabel:
      dbMatch.scheduledAt != null ? formatScheduleDate(dbMatch.scheduledAt) : null,
    setScore: hasScore ? { home: homeWins, away: awayWins } : null,
    winnerSide,
    sets: setsToShow,
  };
}

/** @deprecated use buildFinalsBracketView */
export type PlayoffBracketView = FinalsBracketView;

export function buildFinalsBracketView(matches: PlayoffDbMatch[]): FinalsBracketView {
  const finalMatches = pickFinalMatchesFromSeason(matches);
  const awayFromSchedule = finalMatches[0] ? resolveAwaySlot(finalMatches[0]) : null;
  const awayFallback: PlayoffSlot =
    awayFromSchedule ??
    ({ kind: "placeholder", label: "플레이오프 승자" } satisfies PlayoffSlot);

  const game1 = enrichFinalGame(1, finalMatches[0], awayFallback);
  const game2 = enrichFinalGame(2, finalMatches[1], awayFallback);
  const seriesRecord = computeSeriesRecord(game1, game2);
  let superAce = enrichSuperAce(pickSuperAceMatch(matches, finalMatches));
  if (!superAce && seriesRecord?.wins === 1 && seriesRecord.losses === 1) {
    superAce = getFinaleSuperAceFallback(game1, game2);
  }
  const champion = resolveChampion(game1, game2, superAce);
  const isComplete = champion != null;

  return {
    title: isComplete ? "우승" : "결승",
    games: [game1, game2],
    superAce,
    champion,
    seriesRecord,
    isComplete,
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
  seasonMatches: PlayoffDbMatch[],
): string | null {
  const finalMatches = pickFinalMatchesFromSeason(seasonMatches);
  const finalIndex = finalMatches.findIndex((item) => item.id === match.id);
  if (finalIndex >= 0) {
    return `결승 ${finalIndex + 1}차전`;
  }

  const superAceMatch = pickSuperAceMatch(seasonMatches, finalMatches);
  if (superAceMatch?.id === match.id) {
    return "슈퍼에이스결정전";
  }

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

  if (home === FINAL_HOME_NAME || away === FINAL_HOME_NAME) {
    return "결승";
  }

  return "플레이오프";
}
