import { auth } from "@/auth";
import { getSelectedSeason } from "@/lib/data";
import { ensureDevStaffWelcomePoints, getDevStaffAuthContext, isDevStaffBypassEnabled } from "@/lib/dev-auth";
import { isDiscordAdmin, isDiscordStaff } from "@/lib/discord-staff";
import { isLeadershipRole } from "@/lib/entry";
import { prisma } from "@/lib/prisma";
import type { ActingRole } from "@/lib/entry";
import type { PlayerRole } from "@prisma/client";
import { NextResponse } from "next/server";

export type AuthPlayer = {
  id: string;
  teamId: string;
  nickname: string;
  role: PlayerRole;
};

export type AuthContext = {
  discordUserId: string;
  player: AuthPlayer | null;
  isAdmin: boolean;
  isStaff: boolean;
};

export type MatchPermissionSnapshot = {
  matchId: string;
  canEditEntry: boolean;
  canEditResults: boolean;
  entryTeamId: string | null;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isDevStaffBypassEnabled()) {
    await ensureDevStaffWelcomePoints();
    return getDevStaffAuthContext();
  }

  const session = await auth();
  const discordUserId = session?.user?.id;

  if (!discordUserId) {
    return null;
  }

  const season = await getSelectedSeason();
  const player = season
    ? await prisma.player.findFirst({
        where: {
          discordUserId,
          isActive: true,
          team: { seasonId: season.id },
        },
        select: {
          id: true,
          teamId: true,
          nickname: true,
          role: true,
        },
      })
    : null;

  const isAdmin = isDiscordAdmin(discordUserId);
  const isStaff = await isDiscordStaff(discordUserId);

  return {
    discordUserId,
    player,
    isAdmin,
    isStaff,
  };
}

export function unauthorized(message = "로그인이 필요합니다.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "권한이 없습니다.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAuthContext(): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();
  if (!context) {
    return unauthorized();
  }

  return context;
}

export async function requireStaffContext(): Promise<AuthContext | NextResponse> {
  const context = await requireAuthContext();
  if (context instanceof NextResponse) {
    return context;
  }

  if (!context.isStaff) {
    return forbidden("운영진만 접근할 수 있습니다.");
  }

  return context;
}

export function isTeamLeader(context: AuthContext | null) {
  return Boolean(context?.player && isLeadershipRole(context.player.role));
}

export function canManageRoster(context: AuthContext | null) {
  return Boolean(context?.isStaff);
}

export function canManageSchedule(context: AuthContext | null) {
  return Boolean(context?.isStaff || isTeamLeader(context));
}

export function assertRosterTeamPermission(
  context: AuthContext,
  _teamId: string,
): NextResponse | null {
  if (context.isStaff) {
    return null;
  }

  return forbidden("운영진만 로스터를 관리할 수 있습니다.");
}

export async function requireRosterContext(): Promise<AuthContext | NextResponse> {
  const context = await requireAuthContext();
  if (context instanceof NextResponse) {
    return context;
  }

  if (!canManageRoster(context)) {
    return forbidden("운영진만 로스터를 관리할 수 있습니다.");
  }

  return context;
}

export async function requireScheduleContext(): Promise<AuthContext | NextResponse> {
  const context = await requireAuthContext();
  if (context instanceof NextResponse) {
    return context;
  }

  if (!canManageSchedule(context)) {
    return forbidden("팀장·부팀장 또는 운영진만 일정을 관리할 수 있습니다.");
  }

  return context;
}

export async function assertPlayerRosterPermission(
  context: AuthContext,
  playerId: string,
): Promise<NextResponse | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true, isActive: true },
  });

  if (!player || !player.isActive) {
    return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });
  }

  return assertRosterTeamPermission(context, player.teamId);
}

export function canManageStaffTools(context: AuthContext | null) {
  return Boolean(context?.isStaff);
}

export function canEditRules(context: AuthContext | null) {
  return Boolean(context?.isStaff);
}

export function assertEntryEditPermission(
  context: AuthContext,
  match: { homeTeamId: string; awayTeamId: string },
  teamId: string,
): NextResponse | null {
  if (context.isAdmin) {
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      return forbidden("이 경기의 팀이 아닙니다.");
    }

    return null;
  }

  if (!context.player || !isLeadershipRole(context.player.role)) {
    return forbidden("팀장 또는 부팀장만 엔트리를 수정할 수 있습니다.");
  }

  if (context.player.teamId !== teamId) {
    return forbidden("자신의 팀 엔트리만 수정할 수 있습니다.");
  }

  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return forbidden("이 경기의 팀이 아닙니다.");
  }

  return null;
}

export function assertResultsEditPermission(
  context: AuthContext,
  match: { homeTeamId: string; awayTeamId: string },
): NextResponse | null {
  if (context.isStaff) {
    return null;
  }

  if (
    context.player &&
    isLeadershipRole(context.player.role) &&
    (context.player.teamId === match.homeTeamId || context.player.teamId === match.awayTeamId)
  ) {
    return null;
  }

  return forbidden("경기결과 수정 권한이 없습니다.");
}

export function resolveEntryViewer(context: AuthContext | null): {
  viewerTeamId: string | null;
  viewerRole: ActingRole;
} {
  if (context?.player && isLeadershipRole(context.player.role)) {
    return {
      viewerTeamId: context.player.teamId,
      viewerRole: context.player.role,
    };
  }

  return {
    viewerTeamId: null,
    viewerRole: null,
  };
}

export async function getMatchPermissions(
  context: AuthContext | null,
  matchId: string,
): Promise<MatchPermissionSnapshot | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });

  if (!match || !context) {
    return match
      ? {
          matchId: match.id,
          canEditEntry: false,
          canEditResults: false,
          entryTeamId: null,
        }
      : null;
  }

  const canEditResults = assertResultsEditPermission(context, match) === null;
  const entryTeamId =
    context.player &&
    isLeadershipRole(context.player.role) &&
    (context.player.teamId === match.homeTeamId || context.player.teamId === match.awayTeamId)
      ? context.player.teamId
      : null;

  return {
    matchId: match.id,
    canEditEntry: context.isAdmin || entryTeamId !== null,
    canEditResults,
    entryTeamId: context.isAdmin ? null : entryTeamId,
  };
}
