import {
  canManageRoster,
  canManageSchedule,
  getAuthContext,
  getMatchPermissions,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getAuthContext();
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!context) {
    return NextResponse.json({
      loggedIn: false,
      isAdmin: false,
      isStaff: false,
      player: null,
      canManageRoster: false,
      canManageSchedule: false,
      canEditRules: false,
      match: null,
    });
  }

  const match = matchId ? await getMatchPermissions(context, matchId) : null;

  return NextResponse.json({
    loggedIn: true,
    discordUserId: context.discordUserId,
    isAdmin: context.isAdmin,
    isStaff: context.isStaff,
    player: context.player,
    canManageRoster: canManageRoster(context),
    canManageSchedule: canManageSchedule(context),
    canEditRules: context.isStaff,
    match,
  });
}
