import { prisma } from "@/lib/prisma";

export function getBaseElo(tier: number): number {
  switch (tier) {
    case 1: return 1800;
    case 2: return 1600;
    case 3: return 1400;
    case 4: return 1200;
    case 5: return 1000;
    default: return 1000;
  }
}

export async function recalculateAllElos() {
  // 1. Fetch all players to initialize/reset their ELO to the base ELO based on their tier.
  const players = await prisma.player.findMany();
  const playerElos = new Map<string, number>();

  for (const player of players) {
    playerElos.set(player.id, getBaseElo(player.tier));
  }

  // 2. Fetch all set results that are completed (where loserPlayerId is not null, i.e., non-forfeits)
  // sorted chronologically by playedAt and then by id
  const setResults = await prisma.setResult.findMany({
    where: {
      isForfeit: false,
      loserPlayerId: { not: null },
    },
    orderBy: [
      { playedAt: "asc" },
      { id: "asc" },
    ],
    include: {
      winnerPlayer: true,
      loserPlayer: true,
    },
  });

  const K = 32;

  // 3. Sequentially calculate ELO
  for (const result of setResults) {
    const winnerId = result.winnerPlayerId;
    const loserId = result.loserPlayerId;

    if (!winnerId || !loserId) continue;

    const winnerElo = playerElos.get(winnerId) ?? getBaseElo(result.winnerPlayer.tier);
    const loserElo = playerElos.get(loserId) ?? (result.loserPlayer ? getBaseElo(result.loserPlayer.tier) : 1000);

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    const deltaWinner = Math.round(K * (1 - expectedWinner));
    const deltaLoser = Math.round(K * (0 - expectedLoser));

    playerElos.set(winnerId, winnerElo + deltaWinner);
    playerElos.set(loserId, loserElo + deltaLoser);
  }

  // 4. Update the database using a transaction
  await prisma.$transaction(
    Array.from(playerElos.entries()).map(([playerId, elo]) =>
      prisma.player.update({
        where: { id: playerId },
        data: { elo },
      })
    )
  );
}
