import { PrismaClient } from "@prisma/client";

const WELCOME_POINTS = 100;
const prisma = new PrismaClient();

async function grantWelcome(discordUserId: string) {
  const existing = await prisma.discordWallet.findUnique({
    where: { discordUserId },
    select: { points: true },
  });

  if (!existing) {
    await prisma.discordWallet.create({
      data: { discordUserId, points: WELCOME_POINTS },
    });
    return { action: "created" as const, points: WELCOME_POINTS };
  }

  if (existing.points === 0) {
    await prisma.discordWallet.update({
      where: { discordUserId },
      data: { points: WELCOME_POINTS },
    });
    return { action: "updated" as const, points: WELCOME_POINTS };
  }

  return { action: "skipped" as const, points: existing.points };
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: tsx scripts/grant-welcome-points.ts <discordUserId> ...");
    process.exit(1);
  }

  for (const discordUserId of ids) {
    const result = await grantWelcome(discordUserId);
    console.log(`${discordUserId}: ${result.action} (${result.points}P)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
