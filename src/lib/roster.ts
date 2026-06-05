import type { PlayerRole, Race } from "@prisma/client";

export const RACES: Race[] = ["P", "T", "Z"];
export const TIERS = [1, 2, 3, 4, 5] as const;

export const ROLE_OPTIONS = [
  { value: "MEMBER", label: "일반" },
  { value: "CAPTAIN", label: "팀장" },
  { value: "VICE_CAPTAIN", label: "부팀장" },
] as const;

export function roleLabel(role: PlayerRole | string) {
  if (role === "CAPTAIN") return "팀장";
  if (role === "VICE_CAPTAIN") return "부팀장";
  return "";
}

export function parseRace(value: unknown): Race | null {
  if (value === "P" || value === "T" || value === "Z") return value;
  return null;
}

export function parsePlayerRole(value: unknown): PlayerRole | null {
  if (value === "MEMBER" || value === "CAPTAIN" || value === "VICE_CAPTAIN") return value;
  return null;
}

export function parseTier(value: unknown): number | null {
  const tier = Number(value);
  if (Number.isInteger(tier) && tier >= 1 && tier <= 5) return tier;
  return null;
}

export function parseNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.trim();
  if (nickname.length < 1 || nickname.length > 30) return null;
  return nickname;
}

export type PlayerInput = {
  nickname: string;
  race: Race;
  tier: number;
  role: PlayerRole;
};

export function parsePlayerInput(body: unknown): PlayerInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "잘못된 요청입니다." };
  }

  const data = body as Record<string, unknown>;
  const nickname = parseNickname(data.nickname);
  const race = parseRace(data.race);
  const tier = parseTier(data.tier);
  const role = parsePlayerRole(data.role ?? "MEMBER");

  if (!nickname) return { error: "닉네임을 입력해주세요. (1~30자)" };
  if (!race) return { error: "종족을 선택해주세요." };
  if (!tier) return { error: "티어는 1~5 사이여야 합니다." };
  if (!role) return { error: "역할이 올바르지 않습니다." };

  return { nickname, race, tier, role };
}
