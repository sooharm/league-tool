import { MatchManager } from "@/components/MatchManager";
import { StaffGate } from "@/components/StaffGate";
import {
  buildMatchAdminPayload,
  getActiveSeasonForMatchAdmin,
  listSeasonMatches,
} from "@/lib/match-admin-api";

export default async function ScheduleManagePage() {
  const season = await getActiveSeasonForMatchAdmin();

  if (!season) {
    return (
      <StaffGate title="일정 관리" access="schedule">
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      </StaffGate>
    );
  }

  const matches = await listSeasonMatches(season.id);
  const payload = buildMatchAdminPayload(season);

  return (
    <StaffGate
      title="일정 관리"
      description="경기 대진, 일정, 세트 구성을 직접 수정합니다."
      access="schedule"
    >
      <MatchManager
        initialData={{
          ...payload,
          matches: matches.map((match) => ({
            id: match.id,
            week: match.week,
            round: match.round,
            scheduledAt: match.scheduledAt?.toISOString() ?? null,
            status: match.status,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            setCount: match.sets.length,
            hasResults: match.sets.some((set) => set.result),
          })),
        }}
      />
    </StaffGate>
  );
}
