import type { PlayoffBracketView, PlayoffMatchupView, PlayoffSlot } from "@/lib/playoff-bracket";

function SlotName({ slot }: { slot: PlayoffSlot }) {
  if (slot.kind === "placeholder") {
    return <span className="text-[var(--muted)]">{slot.label}</span>;
  }

  return (
    <span className="font-bold" style={{ color: slot.color }}>
      {slot.name}
    </span>
  );
}

function SetRows({ matchup }: { matchup: PlayoffMatchupView }) {
  if (matchup.sets.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        세트·맵이 등록되면 여기에 표시됩니다.
      </p>
    );
  }

  const homeColor = matchup.home.kind === "team" ? matchup.home.color : undefined;
  const awayColor = matchup.away.kind === "team" ? matchup.away.color : undefined;

  return (
    <ul className="mt-8 space-y-3 text-sm sm:text-base">
      {matchup.sets.map((set) => (
        <li
          key={`${matchup.id}-${set.orderIndex}`}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-[var(--card-border)]/50 pb-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)]"
        >
          <span className="font-medium text-[var(--foreground)]">{set.tierLabel}</span>
          <span className="min-w-0 text-[var(--muted)]">
            {set.mapName ? (
              <span className="mr-2 text-[var(--foreground)]/80">{set.mapName}</span>
            ) : null}
            {set.homePlayerName || set.awayPlayerName ? (
              <>
                <span style={homeColor ? { color: homeColor } : undefined}>
                  {set.homePlayerName ?? "미지정"}
                </span>
                <span className="mx-2">vs</span>
                <span style={awayColor ? { color: awayColor } : undefined}>
                  {set.awayPlayerName ?? "미지정"}
                </span>
              </>
            ) : (
              <span>엔트리 대기</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PlayoffBracket({ bracket }: { bracket: PlayoffBracketView }) {
  const { matchup } = bracket;

  return (
    <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-[var(--card)] to-[var(--background)] px-6 py-10 sm:px-12 sm:py-12">
      <p className="text-center text-sm font-semibold tracking-wide text-[var(--accent)] sm:text-base">
        {matchup.label}
        {matchup.scheduledLabel ? (
          <span className="ml-1.5 font-medium text-[var(--muted)]">
            ({matchup.scheduledLabel})
          </span>
        ) : null}
      </p>

      <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
        <p className="min-w-0 flex-1 text-right text-2xl sm:text-4xl">
          <SlotName slot={matchup.home} />
        </p>
        <p className="shrink-0 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--muted)] sm:text-base">
          vs
        </p>
        <p className="min-w-0 flex-1 text-left text-2xl sm:text-4xl">
          <SlotName slot={matchup.away} />
        </p>
      </div>

      <div className="mx-auto mt-2 max-w-lg">
        <SetRows matchup={matchup} />
      </div>
    </div>
  );
}
