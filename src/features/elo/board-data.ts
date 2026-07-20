import {
  calculatePlayerDetailStandings,
  calculatePlayerSetHistory,
  type PlayerSetHistoryEntry,
} from "@/lib/player-stats";
import { calculateRaceMatrixStats } from "@/lib/race-matrix-stats";
import type { MatchForMapStats } from "@/lib/map-stats";
import type { MatchWithResults } from "@/lib/standings";
import { getBaseRp } from "@/features/elo/constants";
import { getSeasonMatches } from "@/lib/data";
import { prisma, ensurePrismaConnection } from "@/lib/prisma";

export type EloBoardRow = {
  playerId: string | null;
  clanMemberId: string;
  nickname: string;
  race: string;
  tier: number;
  elo: number;
  teamName: string;
  teamColor: string;
  seasonName: string;
};

export type EloPlayerProfile = {
  playerId: string;
  nickname: string;
  race: string;
  tier: number;
  elo: number;
  teamName: string;
  teamColor: string;
  seasonName: string;
  wins: number;
  losses: number;
  upsets: number;
  setHistory: PlayerSetHistoryEntry[];
  raceMatrix: ReturnType<typeof calculateRaceMatrixStats>;
};

export async function getEloBoardRows(): Promise<EloBoardRow[]> {
  await ensurePrismaConnection();

  const [members, players] = await Promise.all([
    prisma.clanMember.findMany({
      where: { isActive: true, tier: { gte: 1 } },
      orderBy: [{ rp: "desc" }, { nickname: "asc" }],
    }),
    prisma.player.findMany({
      where: { isActive: true },
      select: { id: true, nickname: true },
    }),
  ]);

  const playerIdByNickname = new Map(players.map((player) => [player.nickname, player.id]));

  return members.map((member) => ({
    playerId: playerIdByNickname.get(member.nickname) ?? null,
    clanMemberId: member.id,
    nickname: member.nickname,
    race: member.race,
    tier: member.tier,
    elo: member.rp,
    teamName: "",
    teamColor: "var(--muted)",
    seasonName: "",
  }));
}

export async function getEloPlayerProfile(playerId: string): Promise<EloPlayerProfile | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      team: {
        include: { season: true },
      },
    },
  });

  if (!player || !player.isActive) {
    return null;
  }

  const clanMember = await prisma.clanMember.findFirst({
    where: { nickname: player.nickname, isActive: true },
    select: { tier: true, rp: true, race: true },
  });

  const seasonId = player.team.seasonId;
  const [players, seasonMatches] = await Promise.all([
    prisma.player.findMany({
      where: { team: { seasonId }, isActive: true },
      include: { team: true },
    }),
    getSeasonMatches(seasonId),
  ]);

  const matches = seasonMatches as MatchWithResults[];
  const standings = calculatePlayerDetailStandings(players, matches);
  const standing = standings.find((row) => row.playerId === playerId);

  const setHistory = calculatePlayerSetHistory(
    playerId,
    players.map((item) => ({ id: item.id, nickname: item.nickname })),
    matches,
  );

  const playerMatches = matches.filter((match) =>
    match.sets.some(
      (set) =>
        set.result &&
        (set.result.winnerPlayerId === playerId || set.result.loserPlayerId === playerId),
    ),
  );

  const raceMatrix = calculateRaceMatrixStats(playerMatches as MatchForMapStats[]);

  return {
    playerId: player.id,
    nickname: player.nickname,
    race: clanMember?.race ?? player.race,
    tier: clanMember?.tier ?? player.tier,
    elo: clanMember?.rp ?? player.elo ?? getBaseRp(player.tier),
    teamName: player.team.name,
    teamColor: player.team.color,
    seasonName: player.team.season.name,
    wins: standing?.wins ?? 0,
    losses: standing?.losses ?? 0,
    upsets: standing?.upsets ?? 0,
    setHistory: setHistory.reverse(),
    raceMatrix,
  };
}
