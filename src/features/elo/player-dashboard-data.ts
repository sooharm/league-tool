import { getAllLeagueMatches } from "@/lib/data";
import { getEloBoardRows } from "@/features/elo/board-data";
import {
  buildLastTenGames,
  calculateHeadToHead,
  calculateLeagueStats,
  calculateMapStats,
  calculateRaceStats,
  calculateStreakSummary,
  calculateTierMatrix,
  collectHeadToHeadOpponents,
  collectPlayerSetEvents,
  type HeadToHeadSummary,
  type LastGameRow,
  type StreakSummary,
  type TierMatrixRow,
  type WinLossRow,
} from "@/lib/player-dashboard-stats";
import { prisma } from "@/lib/prisma";
import type { MatchWithResults } from "@/lib/standings";

export type EloPlayerDashboard = {
  summary: {
    playerId: string;
    nickname: string;
    race: string;
    tier: number;
    elo: number;
    rank: number | null;
  };
  raceStats: WinLossRow[];
  leagueStats: WinLossRow[];
  mapStats: WinLossRow[];
  lastTenGames: LastGameRow[];
  streak: StreakSummary;
  tierStats: TierMatrixRow[];
  headToHeadOpponents: { playerId: string; nickname: string }[];
};

export type EloPlayerDashboardWithH2H = EloPlayerDashboard & {
  headToHead?: HeadToHeadSummary & { opponentNickname: string };
};

export async function getEloPlayerDashboard(
  playerId: string,
  opponentPlayerId?: string | null,
): Promise<EloPlayerDashboardWithH2H | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      nickname: true,
      race: true,
      tier: true,
      elo: true,
      isActive: true,
    },
  });

  if (!player || !player.isActive) {
    return null;
  }

  const [allMatches, allPlayers, boardRows] = await Promise.all([
    getAllLeagueMatches(),
    prisma.player.findMany({ select: { id: true, nickname: true } }),
    getEloBoardRows(),
  ]);

  const nicknames = new Map(allPlayers.map((item) => [item.id, item.nickname]));
  const matches = allMatches as MatchWithResults[];
  const events = collectPlayerSetEvents(
    player.id,
    player.race,
    player.tier,
    nicknames,
    matches,
  );

  const rankIndex = boardRows.findIndex((row) => row.playerId === player.id);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const boardRow = boardRows.find((row) => row.playerId === player.id);

  const dashboard: EloPlayerDashboardWithH2H = {
    summary: {
      playerId: player.id,
      nickname: player.nickname,
      race: boardRow?.race ?? player.race,
      tier: boardRow?.tier ?? player.tier,
      elo: boardRow?.elo ?? player.elo,
      rank,
    },
    raceStats: calculateRaceStats(events),
    leagueStats: calculateLeagueStats(events),
    mapStats: calculateMapStats(events),
    lastTenGames: buildLastTenGames(events, player.nickname),
    streak: calculateStreakSummary(events),
    tierStats: calculateTierMatrix(events),
    headToHeadOpponents: collectHeadToHeadOpponents(events),
  };

  if (opponentPlayerId) {
    const opponent = dashboard.headToHeadOpponents.find(
      (item) => item.playerId === opponentPlayerId,
    );
    if (opponent) {
      dashboard.headToHead = {
        ...calculateHeadToHead(events, opponentPlayerId),
        opponentNickname: opponent.nickname,
      };
    }
  }

  return dashboard;
}

export async function getEloPlayerOptions() {
  const rows = await getEloBoardRows();
  return rows.map((row) => ({
    playerId: row.playerId,
    nickname: row.nickname,
    elo: row.elo,
    tier: row.tier,
  }));
}
