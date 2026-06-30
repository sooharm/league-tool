import { buildPredictBoardPayload } from "@/lib/prediction-api";
import { placeSetPredictionBet } from "@/lib/points";
import { requireAuthContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ setId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { setId } = await context.params;

  let body: { pickedPlayerId?: string; stake?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const pickedPlayerId = body.pickedPlayerId;
  const stake = body.stake;

  if (!pickedPlayerId || stake == null) {
    return NextResponse.json({ error: "선수와 포인트를 입력해 주세요." }, { status: 400 });
  }

  try {
    await placeSetPredictionBet({
      discordUserId: auth.discordUserId,
      setId,
      pickedPlayerId,
      stake,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (message === "SET_NOT_FOUND") {
      return NextResponse.json({ error: "세트를 찾을 수 없습니다." }, { status: 404 });
    }
    if (message === "SET_NOT_ELIGIBLE") {
      return NextResponse.json({ error: "배팅 대상이 아닌 세트입니다." }, { status: 400 });
    }
    if (message === "INVALID_STAKE") {
      return NextResponse.json({ error: "배팅 포인트는 1~10P 사이여야 합니다." }, { status: 400 });
    }
    if (message === "INVALID_PLAYER") {
      return NextResponse.json({ error: "선택한 선수가 올바르지 않습니다." }, { status: 400 });
    }
    if (message === "PLAYERS_NOT_READY") {
      return NextResponse.json({ error: "엔트리가 확정되지 않아 배팅할 수 없습니다." }, { status: 403 });
    }
    if (message === "PREDICTION_CLOSED") {
      return NextResponse.json({ error: "배팅이 마감되었습니다." }, { status: 403 });
    }
    if (message === "PREDICTION_LOCKED") {
      return NextResponse.json({ error: "이미 정산된 배팅은 수정할 수 없습니다." }, { status: 403 });
    }
    if (message === "INSUFFICIENT_POINTS") {
      return NextResponse.json({ error: "보유 포인트가 부족합니다." }, { status: 400 });
    }

    console.error("[predict] placeSetPredictionBet failed:", error);
    return NextResponse.json({ error: "배팅 처리에 실패했습니다." }, { status: 500 });
  }

  const payload = await buildPredictBoardPayload(auth.discordUserId);
  return NextResponse.json({
    loggedIn: true,
    ...payload,
  });
}
