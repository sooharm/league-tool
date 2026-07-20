import { getEloPlayerOptions } from "@/features/elo/player-dashboard-data";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const players = await getEloPlayerOptions();
  return NextResponse.json({ players });
}
