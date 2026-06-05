import type { MatchWithResults, PlayerStanding } from "@/lib/standings";
import type { Race } from "@prisma/client";

export type MatchupRecord = {
  wins: number;
  losses: number;
};

export type PlayerDetailStanding = PlayerStanding & {
  vsZerg: MatchupRecord;
  vsProtoss: MatchupRecord;
  vsTerran: MatchupRecord;
};

type PlayerSetOutcome = "W" | "L";

function createMatchupRecord(): MatchupRecord {
  return { wins: 0, losses: 0 };
}

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

function getOpponentRecord(
  records: {
    vsZerg: MatchupRecord;
    vsProtoss: MatchupRecord;
    vsTerran: MatchupRecord;
  },
  opponentRace: Race,
) {
  if (opponentRace === "Z") return records.vsZerg;
  if (opponentRace === "P") return records.vsProtoss;
  return records.vsTerran;
}

export function calculatePlayerDetailStandings(
  players: {
    id: string;
    nickname: string;
    race: Race;
    tier: number;
    team: { id: string; name: string; color: string };
  }[],
  matches: MatchWithResults[],
): PlayerDetailStanding[] {
  const stats = new Map<
    string,
    {
      playerId: string;
      nickname: string;
      teamId: string;
      teamName: string;
      teamColor: string;
      race: string;
      tier: number;
      wins: number;
      losses: number;
      vsZerg: MatchupRecord;
      vsProtoss: MatchupRecord;
      vsTerran: MatchupRecord;
    }
  >();
  const outcomes = new Map<string, PlayerSetOutcome[]>();
  const playerRaces = new Map<string, Race>();

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
      vsZerg: createMatchupRecord(),
      vsProtoss: createMatchupRecord(),
      vsTerran: createMatchupRecord(),
    });
    outcomes.set(player.id, []);
    playerRaces.set(player.id, player.race);
  }

  const events: {
    playedAt: Date;
    week: number;
    orderIndex: number;
    matchId: string;
    winnerPlayerId: string;
    loserPlayerId: string;
  }[] = [];

  for (const match of matches) {
    for (const set of match.sets) {
      if (!set.result) continue;

      events.push({
        playedAt: set.result.playedAt,
        week: match.week,
        orderIndex: set.orderIndex,
        matchId: match.id,
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
    const loser = stats.get(event.loserPlayerId);
    const loserRace = playerRaces.get(event.loserPlayerId);
    const winnerRace = playerRaces.get(event.winnerPlayerId);

    if (winner) winner.wins += 1;
    if (loser) loser.losses += 1;

    outcomes.get(event.winnerPlayerId)?.push("W");
    outcomes.get(event.loserPlayerId)?.push("L");

    if (winner && loserRace) {
      getOpponentRecord(winner, loserRace).wins += 1;
    }

    if (loser && winnerRace) {
      getOpponentRecord(loser, winnerRace).losses += 1;
    }
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
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return a.nickname.localeCompare(b.nickname, "ko");
    });
}

export function formatMatchupRecord(record: MatchupRecord) {
  return `${record.wins}승 ${record.losses}패`;
}

export function formatWinLossRecord(wins: number, losses: number) {
  return `${wins}승 ${losses}패`;
}
