import { getBaseRp } from "@/features/elo/constants";
import { prisma } from "@/lib/prisma";

export type ClanRpSnapshot = {
  tierByNickname: Map<string, number>;
  rpByNickname: Map<string, number>;
};

export async function loadClanRpSnapshot(): Promise<ClanRpSnapshot> {
  const members = await prisma.clanMember.findMany({
    where: { isActive: true, tier: { gte: 1 } },
    select: { nickname: true, tier: true, rp: true },
  });

  const tierByNickname = new Map<string, number>();
  const rpByNickname = new Map<string, number>();

  for (const member of members) {
    tierByNickname.set(member.nickname, member.tier);
    rpByNickname.set(member.nickname, member.rp);
  }

  return { tierByNickname, rpByNickname };
}

export function createInitialClanRpSnapshot(
  members: { nickname: string; tier: number }[],
): ClanRpSnapshot {
  const tierByNickname = new Map<string, number>();
  const rpByNickname = new Map<string, number>();

  for (const member of members) {
    tierByNickname.set(member.nickname, member.tier);
    rpByNickname.set(member.nickname, getBaseRp(member.tier));
  }

  return { tierByNickname, rpByNickname };
}

export function resolveOfficialTier(
  nickname: string,
  fallbackTier: number,
  snapshot: ClanRpSnapshot,
): number {
  return snapshot.tierByNickname.get(nickname) ?? fallbackTier;
}

export async function persistClanRpSnapshot(snapshot: ClanRpSnapshot) {
  const updates = Array.from(snapshot.rpByNickname.entries()).map(([nickname, rp]) =>
    prisma.clanMember.updateMany({
      where: { nickname, isActive: true },
      data: { rp },
    }),
  );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  await syncLinkedPlayerElo(snapshot);
}

export async function applyRpDeltaByNickname(
  winnerNickname: string,
  loserNickname: string,
  winnerDelta: number,
  loserDelta: number,
) {
  await prisma.$transaction([
    prisma.clanMember.updateMany({
      where: { nickname: winnerNickname, isActive: true },
      data: { rp: { increment: winnerDelta } },
    }),
    prisma.clanMember.updateMany({
      where: { nickname: loserNickname, isActive: true },
      data: { rp: { increment: loserDelta } },
    }),
  ]);

  const [winner, loser] = await Promise.all([
    prisma.clanMember.findFirst({
      where: { nickname: winnerNickname, isActive: true },
      select: { rp: true },
    }),
    prisma.clanMember.findFirst({
      where: { nickname: loserNickname, isActive: true },
      select: { rp: true },
    }),
  ]);

  const rpByNickname = new Map<string, number>();
  if (winner) rpByNickname.set(winnerNickname, winner.rp);
  if (loser) rpByNickname.set(loserNickname, loser.rp);
  await syncLinkedPlayerElo({ tierByNickname: new Map(), rpByNickname });
}

async function syncLinkedPlayerElo(snapshot: ClanRpSnapshot) {
  const syncOps = Array.from(snapshot.rpByNickname.entries()).map(([nickname, rp]) =>
    prisma.player.updateMany({
      where: { nickname, isActive: true },
      data: { elo: rp },
    }),
  );

  if (syncOps.length > 0) {
    await prisma.$transaction(syncOps);
  }
}
