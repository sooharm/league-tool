/** 배포 포함 기본 노출. 끄려면 ENABLE_ELO_BOARD=false */
export function isEloBoardEnabled(): boolean {
  return process.env.ENABLE_ELO_BOARD !== "false";
}

export const ELO_BOARD_OPTION_VALUE = "__elo_board__";
export const ELO_BOARD_LABEL = "랭킹포인트(RP)";
