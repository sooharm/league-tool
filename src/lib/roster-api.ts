import { getSelectedSeason } from "@/lib/data";
import { isLeadershipRole } from "@/lib/entry";
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
    data: { role: "MEMBER", discordUserId: null },
  });
}

function freedInactiveNickname(nickname: string, playerId: string) {
  const suffix = `#${playerId.slice(-4)}`;
  const maxBase = Math.max(1, 30 - suffix.length);
  return `${nickname.slice(0, maxBase)}${suffix}`;
}

export async function createPlayer(teamId: string, input: PlayerInput) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return { error: "팀을 찾을 수 없습니다.", status: 404 as const };
  }

  const duplicate = await prisma.player.findFirst({
    where: { teamId, nickname: input.nickname },
  });
  if (duplicate) {
    if (duplicate.isActive) {
      return { error: "같은 팀에 동일한 닉네임이 있습니다.", status: 400 as const };
    }

    await clearConflictingRoles(teamId, input.role, duplicate.id);

    const player = await prisma.player.update({
      where: { id: duplicate.id },
      data: {
        race: input.race,
        tier: input.tier,
        role: input.role,
        isActive: true,
        discordUserId: null,
      },
    });

    return { player };
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
      id: { not: playerId },
    },
  });
  if (duplicate) {
    if (duplicate.isActive) {
      return { error: "같은 팀에 동일한 닉네임이 있습니다.", status: 400 as const };
    }
    return {
      error: "삭제된 선수와 닉네임이 겹칩니다. 다른 닉네임을 사용하거나 삭제된 선수를 복구해 주세요.",
      status: 400 as const,
    };
  }

  await clearConflictingRoles(existing.teamId, input.role, playerId);

  const demotedFromLeadership =
    input.role === "MEMBER" && isLeadershipRole(existing.role);

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      nickname: input.nickname,
      race: input.race,
      tier: input.tier,
      role: input.role,
      ...(demotedFromLeadership ? { discordUserId: null } : {}),
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
      data: {
        isActive: false,
        discordUserId: null,
        nickname: freedInactiveNickname(existing.nickname, playerId),
      },
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
    const conflicts = await prisma.player.findMany({
      where: {
        discordUserId,
        id: { not: playerId },
      },
      select: { id: true, nickname: true, isActive: true },
    });

    const activeConflict = conflicts.find((player) => player.isActive);
    if (activeConflict) {
      return {
        error: `이미 다른 선수에 연결된 Discord 계정입니다. (${activeConflict.nickname} 선수에 이미 연결되어 있습니다.)`,
        status: 400 as const,
      };
    }

    const inactiveConflictIds = conflicts
      .filter((player) => !player.isActive)
      .map((player) => player.id);
    if (inactiveConflictIds.length > 0) {
      await prisma.player.updateMany({
        where: { id: { in: inactiveConflictIds } },
        data: { discordUserId: null },
      });
    }
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { discordUserId },
  });

  return { player };
}

export async function updateTeamName(teamId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "팀명을 입력해 주세요.", status: 400 as const };
  }
  if (trimmed.length > 50) {
    return { error: "팀명은 50자 이하여야 합니다.", status: 400 as const };
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return { error: "팀을 찾을 수 없습니다.", status: 404 as const };
  }

  if (trimmed === team.name) {
    return { team: { id: team.id, name: team.name } };
  }

  const duplicate = await prisma.team.findFirst({
    where: {
      seasonId: team.seasonId,
      name: trimmed,
      NOT: { id: teamId },
    },
  });
  if (duplicate) {
    return { error: "같은 시즌에 이미 사용 중인 팀명입니다.", status: 400 as const };
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { name: trimmed },
    select: { id: true, name: true },
  });

  return { team: updated };
}

export async function parseAndUpdatePlayer(playerId: string, body: unknown) {
  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 as const };
  }
  return updatePlayer(playerId, parsed);
}
