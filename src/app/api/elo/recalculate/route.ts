import { recalculateAllElosFromLeagueResults } from "@/features/elo/calculator";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { getAuthContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Elo System을 사용할 수 없습니다." }, { status: 404 });
  }

  const auth = await getAuthContext();
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있습니다." }, { status: 403 });
  }

  try {
    const updatedCount = await recalculateAllElosFromLeagueResults();
    return NextResponse.json({ ok: true, updatedCount });
  } catch (error) {
    console.error("[elo] recalculate failed:", error);
    return NextResponse.json({ error: "RP 동기화에 실패했습니다." }, { status: 500 });
  }
}
