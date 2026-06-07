import { RosterGate } from "@/components/RosterGate";
import { RosterManager } from "@/components/RosterManager";
import { getAuthContext } from "@/lib/permissions";
import { getActiveSeasonRoster } from "@/lib/roster-api";

export default async function RosterManagePage() {
  const roster = await getActiveSeasonRoster();
  const auth = await getAuthContext();
  const managedTeamId = auth?.isStaff ? null : (auth?.player?.teamId ?? null);

  if (!roster) {
    return (
      <RosterGate title="로스터 관리">
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      </RosterGate>
    );
  }

  return (
    <RosterGate
      title="로스터 관리"
      description="팀별 선수 등록 · 수정 · Discord 계정 연결"
    >
      <RosterManager initialData={roster} managedTeamId={managedTeamId} />
    </RosterGate>
  );
}
