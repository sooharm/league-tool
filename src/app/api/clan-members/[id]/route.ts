import {
  getActiveClanMembers,
  parseAndUpdateClanMember,
  removeClanMember,
} from "@/lib/clan-member-api";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { requireRosterContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await parseAndUpdateClanMember(id, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const members = await getActiveClanMembers();
  return NextResponse.json({ member: result.member, members });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isEloBoardEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await context.params;

  const result = await removeClanMember(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const members = await getActiveClanMembers();
  return NextResponse.json({ ...result, members });
}
