import type { MatchWithResults } from "@/lib/standings";
import type { Race } from "@prisma/client";

export type WinLossRow = {
  label: string;
  wins: number;
  losses: number;
  winRate: number | null;
  pending?: boolean;
};

export type PlayerSetEvent = {
  playedAt: Date;
  week: number;
  orderIndex: number;
  matchId: string;
  outcome: "win" | "loss";
  opponentPlayerId: string | null;
  opponentNickname: string;
  opponentRace: Race | null;
  opponentTier: number | null;
  mapName: string | null;
  playerRace: Race;
  playerTier: number;
};

export type LastGameRow = {
  date: string | null;
  league: string;
  mapName: string | null;
  winner: string;
  loser: string;
  outcome: "win" | "loss";
};

export type TierMatrixRow = {
  tier: string;
  wins: number;
  losses: number;
  winRate: number | null;
};

export type StreakSummary = {
  currentLabel: string;
  maxWinStreak: number;
  maxLossStreak: number;
};

export type HeadToHeadSummary = {
  wins: number;
  losses: number;
  winRate: number | null;
};

function toWinRate(wins: number, losses: number): number | null {
  const total = wins + losses;
  if (total === 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}

function toWinLossRow(label: string, wins: number, losses: number, pending = false): WinLossRow {
  return { label, wins, losses, winRate: toWinRate(wins, losses), pending };
}

export function collectPlayerSetEvents(
  playerId: string,
  playerRace: Race,
  playerTier: number,
  nicknames: Map<string, string>,
  matches: MatchWithResults[],
): PlayerSetEvent[] {
  const events: (PlayerSetEvent & {
    week: number;
    orderIndex: number;
    matchId: string;
  })[] = [];

  for (const match of matches) {
    for (const set of match.sets) {
      const result = set.result as
        | (typeof set.result & {
            isForfeit?: boolean;
            winnerPlayer?: { race: Race; tier: number };
            loserPlayer?: { race: Race; tier: number } | null;
          })
        | null;
      if (!result) continue;

      const base = {
        playedAt: result.playedAt,
        week: match.week,
        orderIndex: set.orderIndex,
        matchId: match.id,
        mapName: set.mapName,
        playerRace,
        playerTier,
      };

      if (result.winnerPlayerId === playerId) {
        events.push({
          ...base,
          outcome: "win",
          opponentPlayerId: result.isForfeit ? null : result.loserPlayerId,
          opponentNickname: result.isForfeit
            ? "기권"
            : (nicknames.get(result.loserPlayerId ?? "") ?? "알 수 없음"),
          opponentRace: result.isForfeit ? null : (result.loserPlayer?.race ?? null),
          opponentTier: result.isForfeit ? null : (result.loserPlayer?.tier ?? null),
        });
      }

      if (!result.isForfeit && result.loserPlayerId === playerId) {
        events.push({
          ...base,
          outcome: "loss",
          opponentPlayerId: result.winnerPlayerId,
          opponentNickname: nicknames.get(result.winnerPlayerId) ?? "알 수 없음",
          opponentRace: result.winnerPlayer?.race ?? null,
          opponentTier: result.winnerPlayer?.tier ?? null,
        });
      }
    }
  }

  return events.sort((a, b) => {
    const timeDiff = a.playedAt.getTime() - b.playedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.week !== b.week) return a.week - b.week;
    if (a.matchId !== b.matchId) return a.matchId.localeCompare(b.matchId);
    return a.orderIndex - b.orderIndex;
  });
}

export function calculateRaceStats(events: PlayerSetEvent[]): WinLossRow[] {
  const count = (filter: (event: PlayerSetEvent) => boolean) => {
    let wins = 0;
    let losses = 0;
    for (const event of events) {
      if (!filter(event)) continue;
      if (event.outcome === "win") wins += 1;
      else losses += 1;
    }
    return { wins, losses };
  };

  const all = count(() => true);
  const vsZ = count((event) => event.opponentRace === "Z");
  const vsT = count((event) => event.opponentRace === "T");
  const vsP = count((event) => event.opponentRace === "P");

  return [
    toWinLossRow("ALL", all.wins, all.losses),
    toWinLossRow("vs 저그", vsZ.wins, vsZ.losses),
    toWinLossRow("vs 테란", vsT.wins, vsT.losses),
    toWinLossRow("vs 프로토스", vsP.wins, vsP.losses),
  ];
}

export function calculateLeagueStats(events: PlayerSetEvent[]): WinLossRow[] {
  const wins = events.filter((event) => event.outcome === "win").length;
  const losses = events.filter((event) => event.outcome === "loss").length;
  const pro = toWinLossRow("프로리그", wins, losses);

  return [
    toWinLossRow("ALL", wins, losses),
    toWinLossRow("랭킹전", 0, 0, true),
    toWinLossRow("이벤트경기", 0, 0, true),
    pro,
    toWinLossRow("개인리그(통합)", 0, 0, true),
    toWinLossRow("개인리그(티어)", 0, 0, true),
  ];
}

export function calculateMapStats(events: PlayerSetEvent[]): WinLossRow[] {
  const mapStats = new Map<string, { wins: number; losses: number }>();

  for (const event of events) {
    const mapName = event.mapName?.trim() || "미지정";
    const current = mapStats.get(mapName) ?? { wins: 0, losses: 0 };
    if (event.outcome === "win") current.wins += 1;
    else current.losses += 1;
    mapStats.set(mapName, current);
  }

  return Array.from(mapStats.entries())
    .map(([label, stats]) => toWinLossRow(label, stats.wins, stats.losses))
    .sort((a, b) => b.wins + b.losses - (a.wins + a.losses));
}

export function calculateTierMatrix(events: PlayerSetEvent[]): TierMatrixRow[] {
  const byTier = new Map<number, { wins: number; losses: number }>();
  let allWins = 0;
  let allLosses = 0;

  for (const event of events) {
    if (event.outcome === "win") allWins += 1;
    else allLosses += 1;

    const tier = event.opponentTier;
    if (!tier) continue;

    const current = byTier.get(tier) ?? { wins: 0, losses: 0 };
    if (event.outcome === "win") current.wins += 1;
    else current.losses += 1;
    byTier.set(tier, current);
  }

  const rows: TierMatrixRow[] = [
    {
      tier: "ALL",
      wins: allWins,
      losses: allLosses,
      winRate: toWinRate(allWins, allLosses),
    },
  ];

  for (let tier = 1; tier <= 5; tier += 1) {
    const stats = byTier.get(tier) ?? { wins: 0, losses: 0 };
    rows.push({
      tier: String(tier),
      wins: stats.wins,
      losses: stats.losses,
      winRate: toWinRate(stats.wins, stats.losses),
    });
  }

  return rows;
}

export function calculateStreakSummary(events: PlayerSetEvent[]): StreakSummary {
  const outcomes = events.map((event) => (event.outcome === "win" ? "W" : "L")) as ("W" | "L")[];

  if (outcomes.length === 0) {
    return { currentLabel: "-", maxWinStreak: 0, maxLossStreak: 0 };
  }

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const outcome of outcomes) {
    if (outcome === "W") {
      currentWin += 1;
      currentLoss = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWin);
    } else {
      currentLoss += 1;
      currentWin = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLoss);
    }
  }

  const last = outcomes[outcomes.length - 1];
  let streakCount = 0;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    if (outcomes[index] !== last) break;
    streakCount += 1;
  }

  const currentLabel =
    last === "W" ? `현재 ${streakCount}연승중` : `현재 ${streakCount}연패중`;

  return { currentLabel, maxWinStreak, maxLossStreak };
}

export function buildLastTenGames(
  events: PlayerSetEvent[],
  playerNickname: string,
): LastGameRow[] {
  return events
    .slice(-10)
    .reverse()
    .map((event) => ({
      date: event.playedAt.toISOString(),
      league: "프로리그",
      mapName: event.mapName,
      winner: event.outcome === "win" ? playerNickname : event.opponentNickname,
      loser: event.outcome === "win" ? event.opponentNickname : playerNickname,
      outcome: event.outcome,
    }));
}

export function collectHeadToHeadOpponents(events: PlayerSetEvent[]): {
  playerId: string;
  nickname: string;
}[] {
  const opponents = new Map<string, string>();

  for (const event of events) {
    if (!event.opponentPlayerId) continue;
    opponents.set(event.opponentPlayerId, event.opponentNickname);
  }

  return Array.from(opponents.entries())
    .map(([playerId, nickname]) => ({ playerId, nickname }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
}

export function calculateHeadToHead(
  events: PlayerSetEvent[],
  opponentPlayerId: string,
): HeadToHeadSummary {
  let wins = 0;
  let losses = 0;

  for (const event of events) {
    if (event.opponentPlayerId !== opponentPlayerId) continue;
    if (event.outcome === "win") wins += 1;
    else losses += 1;
  }

  return { wins, losses, winRate: toWinRate(wins, losses) };
}
