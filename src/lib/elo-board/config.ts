/** 로컬 개발에서만 Elo Board 노출 (배포 시 ENABLE_ELO_BOARD=true 로 명시적 허용) */
export function isEloBoardEnabled(): boolean {
  if (process.env.ENABLE_ELO_BOARD === "true") {
    return true;
  }

  if (process.env.ENABLE_ELO_BOARD === "false") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

export const ELO_BOARD_OPTION_VALUE = "__elo_board__";
export const ELO_BOARD_LABEL = "랭킹포인트(RP)";
