import { PastSeasonLink } from "@/components/PastSeasonLink";
import { PreseasonShell } from "@/components/PreseasonShell";
import { PAST_SEASONS } from "@/lib/past-seasons";

export default function PastSeasonsPage() {
  return (
    <PreseasonShell>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">과거시즌</h2>
        <p className="text-sm text-[var(--muted)]">이전 시즌 기록을 확인할 수 있습니다.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAST_SEASONS.map((season) => (
            <PastSeasonLink key={season.id} season={season} />
          ))}
        </div>
      </div>
    </PreseasonShell>
  );
}
