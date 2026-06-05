export function hasMatchResults(match: { sets: { result: unknown }[] }) {
  return match.sets.some((set) => set.result);
}

/** 일정 탭: 결과 미입력·미완료 경기만 표시 (경기일 전후 무관, 결과 입력 시 제외) */
export function isVisibleOnScheduleTab(match: {
  status: string;
  sets: { result: unknown }[];
}) {
  if (hasMatchResults(match)) {
    return false;
  }

  if (match.status === "COMPLETED") {
    return false;
  }

  return true;
}
