import type { AuthContext } from "@/lib/permissions";
import { grantWelcomePoints, WELCOME_POINTS } from "@/lib/points";
import { prisma } from "@/lib/prisma";

export const DEV_STAFF_DISCORD_ID = "dev-local-staff";

export function isDevStaffBypassEnabled() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  return process.env.DEV_STAFF_BYPASS !== "false";
}

export function getDevStaffAuthContext(): AuthContext {
  return {
    discordUserId: DEV_STAFF_DISCORD_ID,
    player: null,
    isAdmin: true,
    isStaff: true,
  };
}

/** 로컬 DEV 계정 최초 접속 시 100P 지급. 0P로만 생성된 지갑도 100P로 복구. */
export async function ensureDevStaffWelcomePoints(): Promise<void> {
  try {
    const wallet = await prisma.discordWallet.findUnique({
      where: { discordUserId: DEV_STAFF_DISCORD_ID },
      select: { points: true },
    });

    if (!wallet) {
      await grantWelcomePoints(DEV_STAFF_DISCORD_ID);
      return;
    }

    if (wallet.points === 0) {
      await prisma.discordWallet.update({
        where: { discordUserId: DEV_STAFF_DISCORD_ID },
        data: { points: WELCOME_POINTS },
      });
    }
  } catch (error) {
    console.error("[dev-auth] ensureDevStaffWelcomePoints failed:", error);
  }
}
