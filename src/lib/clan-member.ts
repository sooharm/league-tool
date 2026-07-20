import type { Race } from "@prisma/client";
import { parseNickname, parseRace, parseTier } from "@/lib/roster";

export type ClanMemberInput = {
  nickname: string;
  race: Race;
  tier: number;
};

export function parseClanMemberInput(
  body: unknown,
): ClanMemberInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "잘못된 요청입니다." };
  }

  const data = body as Record<string, unknown>;
  const nickname = parseNickname(data.nickname);
  const race = parseRace(data.race);
  const tier = parseTier(data.tier);

  if (!nickname) return { error: "닉네임을 입력해주세요. (1~30자)" };
  if (!race) return { error: "종족을 선택해주세요." };
  if (!tier) return { error: "티어는 1~5 사이여야 합니다." };

  return { nickname, race, tier };
}
