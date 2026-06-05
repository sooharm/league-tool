import type { MatchStatus, TierBracket } from "@prisma/client";
import { STANDARD_SET_BRACKETS, TIER_BRACKET_OPTIONS } from "@/lib/tier-brackets";

export { TIER_BRACKET_OPTIONS };

export const MATCH_STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "SCHEDULED", label: "예정" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "COMPLETED", label: "종료" },
];

export type SetAdminInput = {
  id?: string;
  orderIndex: number;
  tierBracket: TierBracket;
  mapName: string | null;
};

export type MatchAdminInput = {
  week: number;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string | null;
  status: MatchStatus;
  sets: SetAdminInput[];
};

export function createEmptySet(orderIndex: number): SetAdminInput {
  return {
    orderIndex,
    tierBracket: "TIER_1_2",
    mapName: null,
  };
}

export function defaultSets(): SetAdminInput[] {
  return STANDARD_SET_BRACKETS.map((tierBracket, index) => ({
    orderIndex: index + 1,
    tierBracket,
    mapName: null,
  }));
}

export function validateMatchInput(input: MatchAdminInput): string | null {
  if (input.week < 1) return "주차는 1 이상이어야 합니다.";
  if (input.round < 1) return "라운드는 1 이상이어야 합니다.";
  if (!input.homeTeamId || !input.awayTeamId) return "홈팀과 어웨이팀을 선택해 주세요.";
  if (input.homeTeamId === input.awayTeamId) return "홈팀과 어웨이팀은 달라야 합니다.";
  if (input.sets.length === 0) return "세트를 1개 이상 추가해 주세요.";

  const orderIndexes = input.sets.map((set) => set.orderIndex);
  if (new Set(orderIndexes).size !== orderIndexes.length) {
    return "세트 순서가 중복되었습니다.";
  }

  return null;
}
