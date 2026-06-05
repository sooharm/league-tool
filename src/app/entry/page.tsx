import { PageShell } from "@/components/PageShell";
import { getActiveSeason, getNearestFutureEntryMatch } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function EntryListPage() {
  const season = await getActiveSeason();
  const nearest = season ? await getNearestFutureEntryMatch(season.id) : null;

  if (nearest) {
    redirect(`/entry/${nearest.id}`);
  }

  return (
    <PageShell
      title="엔트리 제출"
      description="다가오는 예정 경기의 엔트리를 작성·확정합니다."
    >
      <p className="text-[var(--muted)]">
        엔트리를 제출할 예정 경기가 없습니다. 일정 탭에서 각 경기 옆 아이콘으로
        이전·공개된 엔트리를 조회할 수 있습니다.
      </p>
    </PageShell>
  );
}
