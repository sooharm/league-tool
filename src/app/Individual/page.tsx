import { IndividualPageShell } from "@/components/IndividualPageShell";
import { INDIVIDUAL_LEAGUE_LABEL } from "@/lib/season-selection";

export default function IndividualLeaguePage() {
  return (
    <IndividualPageShell
      title={INDIVIDUAL_LEAGUE_LABEL}
      description="나무클랜 개인리그 페이지입니다."
    >
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-12 text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">준비 중</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          개인리그 일정·순위·경기결과는 추후 이 영역에서 제공됩니다.
        </p>
      </div>
    </IndividualPageShell>
  );
}
