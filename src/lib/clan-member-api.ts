import { getBaseRp } from "@/features/elo/constants";
import type { ClanMemberInput } from "@/lib/clan-member";
import { parseClanMemberInput } from "@/lib/clan-member";
import { prisma, ensurePrismaConnection } from "@/lib/prisma";

export type ClanMemberRow = {
  id: string;
  nickname: string;
  race: string;
  tier: number;
};

export async function getActiveClanMembers(): Promise<ClanMemberRow[]> {
  await ensurePrismaConnection();
  const members = await prisma.clanMember.findMany({
    where: { isActive: true, tier: { gte: 1 } },
    orderBy: [{ tier: "asc" }, { nickname: "asc" }],
    select: {
      id: true,
      nickname: true,
      race: true,
      tier: true,
    },
  });

  return members;
}

function freedInactiveNickname(nickname: string, memberId: string) {
  const suffix = `#${memberId.slice(-4)}`;
  const maxBase = Math.max(1, 30 - suffix.length);
  return `${nickname.slice(0, maxBase)}${suffix}`;
}

export async function createClanMember(input: ClanMemberInput) {
  const duplicate = await prisma.clanMember.findUnique({
    where: { nickname: input.nickname },
  });

  if (duplicate) {
    if (duplicate.isActive) {
      return { error: "동일한 닉네임이 이미 등록되어 있습니다.", status: 400 as const };
    }

    const member = await prisma.clanMember.update({
      where: { id: duplicate.id },
      data: {
        race: input.race,
        tier: input.tier,
        rp: getBaseRp(input.tier),
        isActive: true,
      },
    });

    return { member };
  }

  const member = await prisma.clanMember.create({
    data: {
      nickname: input.nickname,
      race: input.race,
      tier: input.tier,
      rp: getBaseRp(input.tier),
    },
  });

  return { member };
}

export async function updateClanMember(memberId: string, input: ClanMemberInput) {
  const existing = await prisma.clanMember.findUnique({ where: { id: memberId } });
  if (!existing || !existing.isActive) {
    return { error: "클랜원을 찾을 수 없습니다.", status: 404 as const };
  }

  if (input.nickname !== existing.nickname) {
    const duplicate = await prisma.clanMember.findUnique({
      where: { nickname: input.nickname },
    });
    if (duplicate && duplicate.id !== memberId) {
      if (duplicate.isActive) {
        return { error: "동일한 닉네임이 이미 등록되어 있습니다.", status: 400 as const };
      }
      return {
        error: "비활성 클랜원과 닉네임이 겹칩니다. 다른 닉네임을 사용하거나 비활성 명단을 정리해 주세요.",
        status: 400 as const,
      };
    }
  }

  const member = await prisma.clanMember.update({
    where: { id: memberId },
    data: {
      nickname: input.nickname,
      race: input.race,
      tier: input.tier,
      ...(input.tier !== existing.tier ? { rp: getBaseRp(input.tier) } : {}),
    },
  });

  return { member };
}

export async function removeClanMember(memberId: string) {
  const existing = await prisma.clanMember.findUnique({ where: { id: memberId } });
  if (!existing) {
    return { error: "클랜원을 찾을 수 없습니다.", status: 404 as const };
  }

  await prisma.clanMember.update({
    where: { id: memberId },
    data: {
      isActive: false,
      nickname: freedInactiveNickname(existing.nickname, memberId),
    },
  });

  return { softDeleted: true };
}

export async function parseAndCreateClanMember(body: unknown) {
  const parsed = parseClanMemberInput(body);
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 as const };
  }
  return createClanMember(parsed);
}

export async function parseAndUpdateClanMember(memberId: string, body: unknown) {
  const parsed = parseClanMemberInput(body);
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 as const };
  }
  return updateClanMember(memberId, parsed);
}
