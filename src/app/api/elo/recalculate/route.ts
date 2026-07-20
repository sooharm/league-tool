import { recalculateAllElosFromLeagueResults } from "@/features/elo/calculator";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { isDevStaffBypassEnabled } from "@/lib/dev-auth";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Elo System은 로컬 개발에서만 사용할 수 있습니다." }, { status: 404 });
  }

  if (!isDevStaffBypassEnabled()) {
    return NextResponse.json({ error: "로컬 운영진 모드에서만 동기화할 수 있습니다." }, { status: 403 });
  }

  try {
    const updatedCount = await recalculateAllElosFromLeagueResults();
    return NextResponse.json({ ok: true, updatedCount });
  } catch (error) {
    console.error("[elo] recalculate failed:", error);
    return NextResponse.json({ error: "RP 동기화에 실패했습니다." }, { status: 500 });
  }
}
