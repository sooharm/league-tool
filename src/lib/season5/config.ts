/** 배포 포함 기본 노출. 끄려면 ENABLE_SEASON5=false */
export function isSeason5Enabled(): boolean {
  return process.env.ENABLE_SEASON5 !== "false";
}

export const SEASON5_OPTION_VALUE = "__season5__";
export const SEASON5_LABEL = "나무포인트(NP)";
export const SEASON5_NP_BOARD_TITLE = "NP보드";
export const SEASON5_MINIGAME_TITLE = "미니게임: 나무클랜배 스타리그";
