import { MatchResultItem } from "@/components/MatchResultItem";
import { PageShell } from "@/components/PageShell";
import { getActiveSeason, getResultInputMatches } from "@/lib/data";
import { groupMatchesByWeek, type CompletedMatch } from "@/lib/match-display";
import {
  getResultInputStatus,
  getResultInputStatusLabel,
} from "@/lib/results";

export default async function ResultsPage() {
  const season = await getActiveSeason();
  const matches = season ? await getResultInputMatches(season.id) : [];
  const grouped = groupMatchesByWeek(matches);

  return (
    <PageShell
      title="경기결과"
      description="주차별 경기 결과를 확인하고 맵·선수·승자를 입력할 수 있습니다."
    >
      {matches.length === 0 ? (
        <p className="text-[var(--muted)]">세트가 등록된 경기가 없습니다.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekMatches]) => (
              <section key={week}>
                <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">
                  {week}주차 ({weekMatches[0]?.round}R)
                </h3>
                <div className="space-y-2">
                  {weekMatches.map((match) => {
                    const status = getResultInputStatus(match);
                    return (
                      <MatchResultItem
                        key={match.id}
                        match={match as CompletedMatch}
                        status={status}
                        statusLabel={getResultInputStatusLabel(status)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </PageShell>
  );
}
