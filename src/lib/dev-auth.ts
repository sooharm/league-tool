import type { AuthContext } from "@/lib/permissions";

const DEV_STAFF_DISCORD_ID = "dev-local-staff";

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
    isStaff: true,
  };
}
