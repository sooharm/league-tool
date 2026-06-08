import type { MatchWithResults, PlayerStanding } from "@/lib/standings";
import type { Race } from "@prisma/client";

export type PlayerDetailStanding = PlayerStanding & {
  upsets: number;
};

export type PlayerSetHistoryEntry = {
  week: number;
  round: number;
  opponentNickname: string;
  mapName: string | null;
  outcome: "win" | "loss";
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

type ChronologicalSetEvent = {
  playedAt: Date;
  week: number;
  orderIndex: number;
  matchId: string;
};

function sortChronologicalSetEvents<T extends ChronologicalSetEvent>(entries: T[]) {
  return entries.sort((a, b) => {
    const timeDiff = a.playedAt.getTime() - b.playedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.week !== b.week) return a.week - b.week;
    if (a.matchId !== b.matchId) return a.matchId.localeCompare(b.matchId);
    return a.orderIndex - b.orderIndex;
  });
}

export function calculatePlayerSetHistory(
  playerId: string,
  players: { id: string; nickname: string }[],
  matches: MatchWithResults[],
): PlayerSetHistoryEntry[] {
  const nicknames = new Map(players.map((player) => [player.id, player.nickname]));
  const entries: (PlayerSetHistoryEntry & ChronologicalSetEvent)[] = [];

  for (const match of matches) {
    for (const set of match.sets) {
      if (!set.result) continue;

      const base = {
        week: match.week,
        round: match.round,
        mapName: set.mapName,
        playedAt: set.result.playedAt,
        orderIndex: set.orderIndex,
        matchId: match.id,
      };

      if (set.result.winnerPlayerId === playerId) {
        entries.push({
          ...base,
          opponentNickname: nicknames.get(set.result.loserPlayerId) ?? "알 수 없음",
          outcome: "win",
        });
      }

      if (set.result.loserPlayerId === playerId) {
        entries.push({
          ...base,
          opponentNickname: nicknames.get(set.result.winnerPlayerId) ?? "알 수 없음",
          outcome: "loss",
        });
      }
    }
  }

  return sortChronologicalSetEvents(entries).map(
    ({ playedAt: _playedAt, orderIndex: _orderIndex, matchId: _matchId, ...entry }) => entry,
  );
}

export function formatPlayerSetHistoryLine(entry: PlayerSetHistoryEntry) {
  const mapLabel = entry.mapName ? `(${entry.mapName})` : "";
  const resultLabel = entry.outcome === "win" ? "승리" : "패배";
  return `${entry.week}/${entry.round} vs ${entry.opponentNickname} ${mapLabel} ${resultLabel}`.trim();
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
      upsets: number;
    }
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
      upsets: 0,
    });
    outcomes.set(player.id, []);
  }

  const events: {
    playedAt: Date;
    week: number;
    orderIndex: number;
    matchId: string;
    winnerPlayerId: string;
    loserPlayerId: string;
    winnerTier: number;
    loserTier: number;
  }[] = [];

  for (const match of matches) {
    for (const set of match.sets) {
      if (!set.result) continue;

      const result = set.result as typeof set.result & {
        winnerPlayer?: { tier: number };
        loserPlayer?: { tier: number };
      };

      const winnerTier =
        result.winnerPlayer?.tier ?? stats.get(result.winnerPlayerId)?.tier ?? 0;
      const loserTier =
        result.loserPlayer?.tier ?? stats.get(result.loserPlayerId)?.tier ?? 0;

      events.push({
        playedAt: result.playedAt,
        week: match.week,
        orderIndex: set.orderIndex,
        matchId: match.id,
        winnerPlayerId: result.winnerPlayerId,
        loserPlayerId: result.loserPlayerId,
        winnerTier,
        loserTier,
      });
    }
  }

  sortChronologicalSetEvents(events);

  for (const event of events) {
    const winner = stats.get(event.winnerPlayerId);
    const loser = stats.get(event.loserPlayerId);

    if (winner) {
      winner.wins += 1;
      if (event.winnerTier > event.loserTier) {
        winner.upsets += 1;
      }
    }
    if (loser) loser.losses += 1;

    outcomes.get(event.winnerPlayerId)?.push("W");
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
    .sort(comparePlayerDetailStandings);
}

/** 승수 내림차순. 동승 시 0승0패는 0승1패·0승2패보다 아래, 그 외는 패수 적은 순. */
export function comparePlayerDetailStandings(a: PlayerDetailStanding, b: PlayerDetailStanding) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.games === 0 && b.games > 0) return 1;
  if (b.games === 0 && a.games > 0) return -1;
  if (a.losses !== b.losses) return a.losses - b.losses;
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  return a.nickname.localeCompare(b.nickname, "ko");
}

export function formatWinLossRecord(wins: number, losses: number) {
  return `${wins}승 ${losses}패`;
}

/** 총전적 + 업셋 횟수 (예: 4승 2패 (1)) */
export function formatWinLossUpsetRecord(wins: number, losses: number, upsets: number) {
  return `${wins}승 ${losses}패 (${upsets})`;
}
