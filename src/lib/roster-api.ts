import { getSelectedSeason } from "@/lib/data";
import { parsePlayerInput, type PlayerInput } from "@/lib/roster";
import { prisma } from "@/lib/prisma";
import type { PlayerRole } from "@prisma/client";

export async function getActiveSeasonRoster() {
  const season = await getSelectedSeason();

  if (!season) return null;

  return {
    season: {
      id: season.id,
      name: season.name,
      teamCount: season.teamCount,
    },
    teams: season.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      sortOrder: team.sortOrder,
      players: team.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        race: player.race,
        tier: player.tier,
        role: player.role,
        discordUserId: player.discordUserId,
      })),
    })),
  };
}

async function clearConflictingRoles(
  teamId: string,
  role: PlayerRole,
  excludePlayerId?: string,
) {
  if (role === "MEMBER") return;

  await prisma.player.updateMany({
    where: {
      teamId,
      role,
      isActive: true,
      ...(excludePlayerId ? { id: { not: excludePlayerId } } : {}),
    },
    data: { role: "MEMBER" },
  });
}

export async function createPlayer(teamId: string, input: PlayerInput) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return { error: "팀을 찾을 수 없습니다.", status: 404 as const };
  }

  const duplicate = await prisma.player.findFirst({
    where: { teamId, nickname: input.nickname, isActive: true },
  });
  if (duplicate) {
    return { error: "같은 팀에 동일한 닉네임이 있습니다.", status: 400 as const };
  }

  await clearConflictingRoles(teamId, input.role);

  const player = await prisma.player.create({
    data: {
      teamId,
      nickname: input.nickname,
      race: input.race,
      tier: input.tier,
      role: input.role,
    },
  });

  return { player };
}

export async function updatePlayer(playerId: string, input: PlayerInput) {
  const existing = await prisma.player.findUnique({ where: { id: playerId } });
  if (!existing || !existing.isActive) {
    return { error: "선수를 찾을 수 없습니다.", status: 404 as const };
  }

  const duplicate = await prisma.player.findFirst({
    where: {
      teamId: existing.teamId,
      nickname: input.nickname,
      isActive: true,
      id: { not: playerId },
    },
  });
  if (duplicate) {
    return { error: "같은 팀에 동일한 닉네임이 있습니다.", status: 400 as const };
  }

  await clearConflictingRoles(existing.teamId, input.role, playerId);

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      nickname: input.nickname,
      race: input.race,
      tier: input.tier,
      role: input.role,
    },
  });

  return { player };
}

export async function removePlayer(playerId: string) {
  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      _count: {
        select: {
          wonSets: true,
          lostSets: true,
          entrySlots: true,
        },
      },
    },
  });

  if (!existing) {
    return { error: "선수를 찾을 수 없습니다.", status: 404 as const };
  }

  const hasHistory =
    existing._count.wonSets > 0 ||
    existing._count.lostSets > 0 ||
    existing._count.entrySlots > 0;

  if (hasHistory) {
    await prisma.player.update({
      where: { id: playerId },
      data: { isActive: false },
    });
    return { softDeleted: true };
  }

  await prisma.player.delete({ where: { id: playerId } });
  return { deleted: true };
}

export async function parseAndCreatePlayer(teamId: string, body: unknown) {
  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 as const };
  }
  return createPlayer(teamId, parsed);
}

export async function linkPlayerDiscord(playerId: string, discordUserId: string | null) {
  const existing = await prisma.player.findUnique({ where: { id: playerId } });
  if (!existing || !existing.isActive) {
    return { error: "선수를 찾을 수 없습니다.", status: 404 as const };
  }

  if (discordUserId) {
    const conflict = await prisma.player.findFirst({
      where: {
        discordUserId,
        isActive: true,
        id: { not: playerId },
      },
    });

    if (conflict) {
      return {
        error: "이미 다른 선수에 연결된 Discord 계정입니다.",
        status: 400 as const,
      };
    }
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { discordUserId },
  });

  return { player };
}

export async function parseAndUpdatePlayer(playerId: string, body: unknown) {
  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 as const };
  }
  return updatePlayer(playerId, parsed);
}
