import { getEloPlayerDashboard } from "@/features/elo/player-dashboard-data";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ playerId: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { playerId } = await context.params;
  const { searchParams } = new URL(request.url);
  const opponentPlayerId = searchParams.get("opponent");

  const dashboard = await getEloPlayerDashboard(playerId, opponentPlayerId);
  if (!dashboard) {
    return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}
