const DISCORD_API = "https://discord.com/api/v10";

function parseAdminUserIds() {
  const raw = process.env.DISCORD_ADMIN_USER_IDS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseStaffRoleIds() {
  const combined = process.env.DISCORD_STAFF_ROLE_IDS ?? "";
  if (combined.trim()) {
    return combined
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [
    process.env.DISCORD_ROLE_CLAN_MASTER,
    process.env.DISCORD_ROLE_DEPUTY_MASTER,
    process.env.DISCORD_ROLE_LEAGUE_OPERATOR,
  ].filter((value): value is string => Boolean(value));
}

export function isDiscordAdmin(discordUserId: string): boolean {
  return parseAdminUserIds().includes(discordUserId);
}

export async function isDiscordStaffRole(discordUserId: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleIds = parseStaffRoleIds();

  if (!guildId || !botToken || roleIds.length === 0) {
    return false;
  }

  try {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return false;
    }

    const member = (await response.json()) as { roles?: string[] };
    const memberRoles = member.roles ?? [];

    return roleIds.some((roleId) => memberRoles.includes(roleId));
  } catch {
    return false;
  }
}

export async function isDiscordStaff(discordUserId: string): Promise<boolean> {
  if (isDiscordAdmin(discordUserId)) {
    return true;
  }

  return isDiscordStaffRole(discordUserId);
}
