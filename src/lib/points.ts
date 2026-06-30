import { prisma } from "@/lib/prisma";

export const WELCOME_POINTS = 100;

export async function grantWelcomePoints(discordUserId: string): Promise<void> {
  try {
    await prisma.discordWallet.upsert({
      where: { discordUserId },
      create: { discordUserId, points: WELCOME_POINTS },
      update: {},
    });
  } catch (error) {
    console.error("[points] grantWelcomePoints failed:", discordUserId, error);
  }
}

export async function getWalletPoints(discordUserId: string): Promise<number> {
  const wallet = await prisma.discordWallet.findUnique({
    where: { discordUserId },
    select: { points: true },
  });

  return wallet?.points ?? 0;
}
