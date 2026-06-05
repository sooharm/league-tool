import { StaffGate } from "@/components/StaffGate";
import { RosterManager } from "@/components/RosterManager";
import { getActiveSeasonRoster } from "@/lib/roster-api";

export default async function RosterManagePage() {
  const roster = await getActiveSeasonRoster();

  if (!roster) {
    return (
      <StaffGate title="로스터 관리">
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      </StaffGate>
    );
  }

  return (
    <StaffGate
      title="로스터 관리"
      description="팀별 선수 등록 · 수정 · Discord 계정 연결"
    >
      <RosterManager initialData={roster} />
    </StaffGate>
  );
}
