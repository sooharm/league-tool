/** 로컬 개발에서만 Season5 미니게임 노출 (배포 시 ENABLE_SEASON5=true 로 명시적 허용) */
export function isSeason5Enabled(): boolean {
  if (process.env.ENABLE_SEASON5 === "true") {
    return true;
  }

  if (process.env.ENABLE_SEASON5 === "false") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

export const SEASON5_OPTION_VALUE = "__season5__";
export const SEASON5_LABEL = "나무포인트(NP)";
export const SEASON5_NP_BOARD_TITLE = "NP보드";
export const SEASON5_MINIGAME_TITLE = "미니게임: 나무클랜배 스타리그";
