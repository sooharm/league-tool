import type { TierBracket } from "@prisma/client";

export const TIER_BRACKET_OPTIONS: { value: TierBracket; label: string }[] = [
  { value: "TIER_1_2", label: "1~2티어" },
  { value: "TIER_2_3", label: "2~3티어" },
  { value: "TIER_3_4", label: "3~4티어" },
  { value: "TIER_4_5", label: "4~5티어" },
  { value: "TIER_2", label: "2티어" },
  { value: "TIER_3", label: "3티어" },
  { value: "TIER_4", label: "4티어" },
  { value: "ACE", label: "에이스결정전" },
];

const LABEL_MAP = Object.fromEntries(
  TIER_BRACKET_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

const LEGACY_LABELS: Record<string, string> = {
  TIER_SINGLE: "단일티어 (구)",
};

export function getTierBracketLabel(bracket: string) {
  return LABEL_MAP[bracket] ?? LEGACY_LABELS[bracket] ?? bracket;
}

export const FIXED_SET_BRACKETS: TierBracket[] = [
  "TIER_1_2",
  "TIER_2_3",
  "TIER_3_4",
  "TIER_4_5",
];

export const DESIGNATED_TIER_BRACKETS: TierBracket[] = ["TIER_2", "TIER_3", "TIER_4"];

export type DesignatedTiers = [TierBracket, TierBracket];

export const DEFAULT_DESIGNATED_TIERS: DesignatedTiers = ["TIER_2", "TIER_4"];

export const STANDARD_SET_BRACKETS: TierBracket[] = TIER_BRACKET_OPTIONS.map(
  (option) => option.value,
);

export function isDesignatedTierBracket(bracket: TierBracket): bracket is DesignatedTiers[number] {
  return (DESIGNATED_TIER_BRACKETS as TierBracket[]).includes(bracket);
}

export function validateDesignatedTiers(tiers: TierBracket[]): tiers is DesignatedTiers {
  if (tiers.length !== 2) return false;
  if (new Set(tiers).size !== 2) return false;
  return tiers.every(isDesignatedTierBracket);
}

/** 정규 6세트(고정 4 + 지정티어 2). 에이스결정전은 경기결과 입력 시 추가 */
export function buildMatchSets(designatedTiers: DesignatedTiers = DEFAULT_DESIGNATED_TIERS) {
  const brackets = [...FIXED_SET_BRACKETS, ...designatedTiers];
  return brackets.map((tierBracket, index) => ({
    orderIndex: index + 1,
    tierBracket,
    mapName: null as string | null,
  }));
}

export function buildStandardSets(designatedTiers?: DesignatedTiers) {
  return buildMatchSets(designatedTiers ?? DEFAULT_DESIGNATED_TIERS);
}
