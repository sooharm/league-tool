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

export const STANDARD_SET_BRACKETS: TierBracket[] = TIER_BRACKET_OPTIONS.map(
  (option) => option.value,
);

export function buildStandardSets() {
  return STANDARD_SET_BRACKETS.map((tierBracket, index) => ({
    orderIndex: index + 1,
    tierBracket,
    mapName: null as string | null,
  }));
}
