import { getSelectedSeason } from "@/lib/data";
import { DEFAULT_RULES_TEXT } from "@/lib/default-rules";
import { prisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

async function getActiveSeason() {
  const season = await getSelectedSeason();
  if (!season) {
    return null;
  }

  return prisma.season.findUnique({
    where: { id: season.id },
    select: { id: true, name: true, rulesText: true },
  });
}

export async function GET() {
  const season = await getActiveSeason();

  if (!season) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    seasonId: season.id,
    seasonName: season.name,
    rulesText: season.rulesText ?? DEFAULT_RULES_TEXT,
  });
}

export async function PUT(request: Request) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const season = await getActiveSeason();

  if (!season) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }

  let body: { rulesText?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof body.rulesText !== "string") {
    return NextResponse.json({ error: "rulesText가 필요합니다." }, { status: 400 });
  }

  const rulesText = body.rulesText.trim();

  if (!rulesText) {
    return NextResponse.json({ error: "규정 내용을 입력해 주세요." }, { status: 400 });
  }

  const updated = await prisma.season.update({
    where: { id: season.id },
    data: { rulesText },
    select: { id: true, name: true, rulesText: true },
  });

  return NextResponse.json({
    seasonId: updated.id,
    seasonName: updated.name,
    rulesText: updated.rulesText,
  });
}
