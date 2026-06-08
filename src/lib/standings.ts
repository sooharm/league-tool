import { resolvePublishedEntrySlotsForMatch, teamHasSixManBonus } from "@/lib/entry";
import type { Match, Set, SetResult, Team } from "@prisma/client";

export type MatchWithResults = Match & {
  homeTeam: Team;
  awayTeam: Team;
  sets: (Set & { result: SetResult | null })[];
  entry?: {
    homeConfirmedAt: Date | null;
    awayConfirmedAt: Date | null;
    publishedAt: Date | null;
    slots: { teamId: string; setId: string; playerId: string }[];
  } | null;
};

export type TeamStanding = {
  teamId: string;
  teamName: string;
  color: string;
  wins: number;
  losses: number;
  games: number;
  points: number;
  setWins: number;
  setLosses: number;
};

export type RankedTeamStanding = TeamStanding & {
  rank: number;
};

export type PlayerStanding = {
  playerId: string;
  nickname: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  race: string;
  tier: number;
  wins: number;
  losses: number;
  games: number;
  winRate: number;
  streakType: "win" | "loss" | null;
  streakCount: number;
  streakLabel: string;
};

type PlayerSetOutcome = "W" | "L";

function computeStreak(outcomes: PlayerSetOutcome[]): {
  streakType: "win" | "loss" | null;
  streakCount: number;
  streakLabel: string;
} {
  if (outcomes.length === 0) {
    return { streakType: null, streakCount: 0, streakLabel: "-" };
  }

  const last = outcomes[outcomes.length - 1];
  let count = 0;

  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    if (outcomes[index] !== last) break;
    count += 1;
  }

  if (count < 2) {
    return { streakType: null, streakCount: count, streakLabel: "-" };
  }

  const streakType: "win" | "loss" = last === "W" ? "win" : "loss";
  return {
    streakType,
    streakCount: count,
    streakLabel: streakType === "win" ? `${count}연승` : `${count}연패`,
  };
}

const POINTS = {
  matchWin: 3,
  sixManEntry: 1,
  aceLossBonus: 1,
  cleanSweep: 1,
} as const;

function getMatchSetScore(match: MatchWithResults, teamId: string) {
  let wins = 0;
  let losses = 0;

  for (const set of match.sets) {
    if (!set.result) continue;
    if (set.result.winnerTeamId === teamId) wins += 1;
    else if (set.result.loserTeamId === teamId) losses += 1;
  }

  return { wins, losses };
}

function getMatchWinner(match: MatchWithResults): string | null {
  const home = getMatchSetScore(match, match.homeTeamId);
  const away = getMatchSetScore(match, match.awayTeamId);

  if (home.wins === 0 && away.wins === 0) return null;
  if (home.wins === away.wins) return null;
  return home.wins > away.wins ? match.homeTeamId : match.awayTeamId;
}

function hasAceSet(match: MatchWithResults) {
  return match.sets.some((set) => set.tierBracket === "ACE" && set.result);
}

function aceLoserTeamId(match: MatchWithResults): string | null {
  const aceSet = match.sets.find((set) => set.tierBracket === "ACE" && set.result);
  return aceSet?.result?.loserTeamId ?? null;
}

function calculateMatchPoints(match: MatchWithResults) {
  const winnerId = getMatchWinner(match);
  if (!winnerId) {
    return { home: 0, away: 0, breakdown: null };
  }

  const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  const winnerIsHome = winnerId === match.homeTeamId;

  const winnerScore = getMatchSetScore(match, winnerId);
  const loserScore = getMatchSetScore(match, loserId);

  let winnerPoints = POINTS.matchWin;
  let loserPoints = 0;

  const entrySlots = resolvePublishedEntrySlotsForMatch(match);

  if (teamHasSixManBonus(match, winnerId, entrySlots)) winnerPoints += POINTS.sixManEntry;
  if (teamHasSixManBonus(match, loserId, entrySlots)) loserPoints += POINTS.sixManEntry;

  if (hasAceSet(match)) {
    const aceLoser = aceLoserTeamId(match);
    if (aceLoser === match.homeTeamId) loserPoints += POINTS.aceLossBonus;
    if (aceLoser === match.awayTeamId) loserPoints += POINTS.aceLossBonus;
  }

  if (loserScore.wins === 0 && winnerScore.wins >= 6) {
    winnerPoints += POINTS.cleanSweep;
  }

  return {
    home: winnerIsHome ? winnerPoints : loserPoints,
    away: winnerIsHome ? loserPoints : winnerPoints,
    breakdown: {
      winnerId,
      winnerPoints: winnerIsHome ? winnerPoints : loserPoints,
      loserPoints: winnerIsHome ? loserPoints : winnerPoints,
    },
  };
}

function teamWinLossDiff(team: TeamStanding) {
  return team.wins - team.losses;
}

function isTeamStandingsTied(a: TeamStanding, b: TeamStanding) {
  return a.points === b.points && teamWinLossDiff(a) === teamWinLossDiff(b);
}

function getStandingsTieGroup(team: TeamStanding, standings: TeamStanding[]) {
  const diff = teamWinLossDiff(team);
  return standings.filter(
    (entry) => entry.points === team.points && teamWinLossDiff(entry) === diff,
  );
}

/** 동률 그룹 내 맞대결 경기 승수 (승자승) */
function getMiniLeagueMatchWins(
  teamId: string,
  groupTeamIds: globalThis.Set<string>,
  matches: MatchWithResults[],
) {
  let wins = 0;

  for (const match of matches) {
    if (!groupTeamIds.has(match.homeTeamId) || !groupTeamIds.has(match.awayTeamId)) {
      continue;
    }

    const winnerId = getMatchWinner(match);
    if (winnerId === teamId) {
      wins += 1;
    }
  }

  return wins;
}

export function compareTeamStandings(
  a: TeamStanding,
  b: TeamStanding,
  standings: TeamStanding[],
  matches: MatchWithResults[],
) {
  if (b.points !== a.points) return b.points - a.points;

  const aDiff = teamWinLossDiff(a);
  const bDiff = teamWinLossDiff(b);
  if (bDiff !== aDiff) return bDiff - aDiff;

  if (isTeamStandingsTied(a, b)) {
    const tieGroup = getStandingsTieGroup(a, standings);
    const groupTeamIds = new Set(tieGroup.map((team) => team.teamId));

    const aHeadToHeadWins = getMiniLeagueMatchWins(a.teamId, groupTeamIds, matches);
    const bHeadToHeadWins = getMiniLeagueMatchWins(b.teamId, groupTeamIds, matches);
    if (bHeadToHeadWins !== aHeadToHeadWins) {
      return bHeadToHeadWins - aHeadToHeadWins;
    }
  }

  return a.teamName.localeCompare(b.teamName, "ko");
}

/** 승점·승패·승자승까지 완전 동률인지 (표시 순서용 가나다순은 제외) */
export function areTeamStandingsRankTied(
  a: TeamStanding,
  b: TeamStanding,
  standings: TeamStanding[],
  matches: MatchWithResults[],
) {
  if (a.points !== b.points || teamWinLossDiff(a) !== teamWinLossDiff(b)) {
    return false;
  }

  const tieGroup = getStandingsTieGroup(a, standings);
  if (!tieGroup.some((team) => team.teamId === b.teamId)) {
    return false;
  }

  const groupTeamIds = new globalThis.Set(tieGroup.map((team) => team.teamId));
  const aHeadToHeadWins = getMiniLeagueMatchWins(a.teamId, groupTeamIds, matches);
  const bHeadToHeadWins = getMiniLeagueMatchWins(b.teamId, groupTeamIds, matches);

  return aHeadToHeadWins === bHeadToHeadWins;
}

export function assignTeamStandingRanks(
  standings: TeamStanding[],
  matches: MatchWithResults[],
): RankedTeamStanding[] {
  const sorted = [...standings].sort((a, b) => compareTeamStandings(a, b, standings, matches));
  const ranked: RankedTeamStanding[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const team = sorted[index];

    if (index === 0) {
      ranked.push({ ...team, rank: 1 });
      continue;
    }

    const previous = sorted[index - 1];
    const rank = areTeamStandingsRankTied(previous, team, standings, matches)
      ? ranked[index - 1].rank
      : index + 1;

    ranked.push({ ...team, rank });
  }

  return ranked;
}

export function calculateTeamStandings(
  teams: Team[],
  matches: MatchWithResults[],
): TeamStanding[] {
  const standings = new Map<string, TeamStanding>();

  for (const team of teams) {
    standings.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      wins: 0,
      losses: 0,
      games: 0,
      points: 0,
      setWins: 0,
      setLosses: 0,
    });
  }

  for (const match of matches) {
    const completedSets = match.sets.filter((set) => set.result);
    if (completedSets.length === 0) continue;

    const winnerId = getMatchWinner(match);
    const points = calculateMatchPoints(match);

    const home = standings.get(match.homeTeamId);
    const away = standings.get(match.awayTeamId);
    if (!home || !away) continue;

    home.points += points.home;
    away.points += points.away;

    const homeSets = getMatchSetScore(match, match.homeTeamId);
    const awaySets = getMatchSetScore(match, match.awayTeamId);
    home.setWins += homeSets.wins;
    home.setLosses += homeSets.losses;
    away.setWins += awaySets.wins;
    away.setLosses += awaySets.losses;

    if (winnerId) {
      home.games += 1;
      away.games += 1;

      if (winnerId === match.homeTeamId) {
        home.wins += 1;
        away.losses += 1;
      } else {
        away.wins += 1;
        home.losses += 1;
      }
    }
  }

  const list = Array.from(standings.values());

  return list.sort((a, b) => compareTeamStandings(a, b, list, matches));
}

export function calculatePlayerStandings(
  players: {
    id: string;
    nickname: string;
    race: string;
    tier: number;
    team: { id: string; name: string; color: string };
  }[],
  matches: MatchWithResults[],
): PlayerStanding[] {
  const stats = new Map<
    string,
    Omit<PlayerStanding, "games" | "winRate" | "streakType" | "streakCount" | "streakLabel">
  >();
  const outcomes = new Map<string, PlayerSetOutcome[]>();

  for (const player of players) {
    stats.set(player.id, {
      playerId: player.id,
      nickname: player.nickname,
      teamId: player.team.id,
      teamName: player.team.name,
      teamColor: player.team.color,
      race: player.race,
      tier: player.tier,
      wins: 0,
      losses: 0,
    });
    outcomes.set(player.id, []);
  }

  const events: {
    playedAt: Date;
    week: number;
    orderIndex: number;
    matchId: string;
    isForfeit: boolean;
    winnerPlayerId: string;
    loserPlayerId: string | null;
  }[] = [];

  for (const match of matches) {
    for (const set of match.sets) {
      if (!set.result) continue;

      events.push({
        playedAt: set.result.playedAt,
        week: match.week,
        orderIndex: set.orderIndex,
        matchId: match.id,
        isForfeit: set.result.isForfeit,
        winnerPlayerId: set.result.winnerPlayerId,
        loserPlayerId: set.result.loserPlayerId,
      });
    }
  }

  events.sort((a, b) => {
    const timeDiff = a.playedAt.getTime() - b.playedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.week !== b.week) return a.week - b.week;
    if (a.matchId !== b.matchId) return a.matchId.localeCompare(b.matchId);
    return a.orderIndex - b.orderIndex;
  });

  for (const event of events) {
    const winner = stats.get(event.winnerPlayerId);

    if (winner) winner.wins += 1;
    outcomes.get(event.winnerPlayerId)?.push("W");

    if (event.isForfeit || !event.loserPlayerId) {
      continue;
    }

    const loser = stats.get(event.loserPlayerId);
    if (loser) loser.losses += 1;
    outcomes.get(event.loserPlayerId)?.push("L");
  }

  return Array.from(stats.values())
    .map((player) => {
      const games = player.wins + player.losses;
      const streak = computeStreak(outcomes.get(player.playerId) ?? []);

      return {
        ...player,
        games,
        winRate: games > 0 ? Math.round((player.wins / games) * 1000) / 10 : 0,
        streakType: streak.streakType,
        streakCount: streak.streakCount,
        streakLabel: streak.streakLabel,
      };
    })
    .filter((player) => player.games > 0)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.nickname.localeCompare(b.nickname, "ko");
    });
}

export { getTierBracketLabel } from "@/lib/tier-brackets";

export {
  aceLoserTeamId,
  calculateMatchPoints,
  getMatchSetScore,
  getMatchWinner,
  hasAceSet,
  POINTS,
};
