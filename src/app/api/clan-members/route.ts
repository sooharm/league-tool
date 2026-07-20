import {
  getActiveClanMembers,
  parseAndCreateClanMember,
} from "@/lib/clan-member-api";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { requireRosterContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await getActiveClanMembers();
  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await parseAndCreateClanMember(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const members = await getActiveClanMembers();
  return NextResponse.json({ member: result.member, members });
}
