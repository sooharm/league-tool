import { buildPredictBoardPayload } from "@/lib/prediction-api";
import { getAuthContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await getAuthContext();
  const payload = await buildPredictBoardPayload(auth?.discordUserId ?? null);

  return NextResponse.json({
    loggedIn: !!auth,
    ...payload,
  });
}
