import type { FinalsBracketView, PlayoffMatchupView, PlayoffSlot } from "@/lib/playoff-bracket";

function SlotName({ slot, size = "lg" }: { slot: PlayoffSlot; size?: "lg" | "xl" }) {
  const sizeClass = size === "xl" ? "text-2xl sm:text-4xl" : "text-xl sm:text-3xl";

  if (slot.kind === "placeholder") {
    return <span className={`${sizeClass} text-[var(--muted)]`}>{slot.label}</span>;
  }

  return (
    <span
      className={`font-extrabold tracking-tight ${sizeClass}`}
      style={{
        color: slot.color,
        textShadow: `0 0 28px ${slot.color}55`,
      }}
    >
      {slot.name}
    </span>
  );
}

function SetRows({ matchup }: { matchup: PlayoffMatchupView }) {
  if (matchup.sets.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-amber-100/50">
        {matchup.setScore
          ? "세트 결과가 없습니다."
          : "세트·맵이 등록되면 여기에 표시됩니다."}
      </p>
    );
  }

  const homeColor = matchup.home.kind === "team" ? matchup.home.color : undefined;
  const awayColor = matchup.away.kind === "team" ? matchup.away.color : undefined;

  return (
    <ul className="mt-6 space-y-3 text-sm sm:text-base">
      {matchup.sets.map((set) => (
        <li
          key={`${matchup.id}-${set.orderIndex}`}
          className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-amber-500/15 pb-3 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
        >
          <span className="font-semibold text-amber-100/90">{set.tierLabel}</span>
          <span className="min-w-0 text-amber-100/60">
            {set.mapName ? (
              <span className="mr-2 text-amber-50/80">{set.mapName}</span>
            ) : null}
            {set.source === "result" ? (
              <>
                <span style={homeColor ? { color: homeColor } : undefined}>
                  {set.homePlayerName}
                </span>{" "}
                <span className="text-amber-100/80">{set.homeLabel}</span>
                <span className="mx-2 text-amber-200/40">vs</span>
                <span style={awayColor ? { color: awayColor } : undefined}>
                  {set.awayPlayerName}
                </span>{" "}
                <span className="text-amber-100/80">{set.awayLabel}</span>
              </>
            ) : set.homePlayerName || set.awayPlayerName ? (
              <>
                <span style={homeColor ? { color: homeColor } : undefined}>
                  {set.homePlayerName ?? "미지정"}
                </span>
                <span className="mx-2 text-amber-200/40">vs</span>
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

function FinalGameCard({ game }: { game: PlayoffMatchupView }) {
  const homeColor = game.home.kind === "team" ? game.home.color : undefined;
  const awayColor = game.away.kind === "team" ? game.away.color : undefined;
  const winnerName =
    game.winnerSide === "home" && game.home.kind === "team"
      ? game.home.name
      : game.winnerSide === "away" && game.away.kind === "team"
        ? game.away.name
        : null;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-[var(--card)] to-black/30 px-5 py-8 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)] sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
        aria-hidden
      />
      <p className="text-center text-sm font-bold tracking-[0.2em] text-amber-300 uppercase sm:text-base">
        {game.label}
        {game.scheduledLabel ? (
          <span className="ml-2 font-medium tracking-normal text-amber-100/55 normal-case">
            ({game.scheduledLabel})
          </span>
        ) : null}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3 sm:mt-8 sm:gap-6">
        <p className="min-w-0 flex-1 text-right">
          <SlotName slot={game.home} />
        </p>
        {game.setScore ? (
          <p className="shrink-0 text-lg font-bold tabular-nums text-amber-50 sm:text-2xl">
            <span style={homeColor ? { color: homeColor } : undefined}>
              {game.setScore.home}
            </span>
            <span className="mx-1 text-amber-200/50">:</span>
            <span style={awayColor ? { color: awayColor } : undefined}>
              {game.setScore.away}
            </span>
          </p>
        ) : (
          <p className="shrink-0 text-xs font-bold tracking-[0.35em] text-amber-200/50 sm:text-sm">
            VS
          </p>
        )}
        <p className="min-w-0 flex-1 text-left">
          <SlotName slot={game.away} />
        </p>
      </div>

      {winnerName ? (
        <p className="mt-4 text-center text-sm font-medium text-amber-300">
          승리: {winnerName}
        </p>
      ) : null}

      <SetRows matchup={game} />
    </article>
  );
}

export function PlayoffBracket({ bracket }: { bracket: FinalsBracketView }) {
  const [game1, game2] = bracket.games;
  const sharedHome = game1?.home.kind === "team" ? game1.home : null;
  const sharedAway = game1?.away.kind === "team" ? game1.away : game1?.away;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-600/20 via-[#1a1208] to-[var(--background)] px-5 py-10 shadow-[0_0_60px_rgba(245,158,11,0.12)] sm:px-10 sm:py-14">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.14),transparent_55%)]"
        aria-hidden
      />

      <div className="relative text-center">
        <p className="text-xs font-semibold tracking-[0.35em] text-amber-300/80 uppercase">
          Season Finals
        </p>
        <h2 className="mt-2 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          결승전
        </h2>
        <p className="mt-3 text-sm text-amber-100/55 sm:text-base">
          목·금 2경기 · 승자가 우승합니다
        </p>
      </div>

      {sharedHome && sharedAway ? (
        <div className="relative mx-auto mt-10 max-w-3xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <SlotName slot={sharedHome} size="xl" />
            <span className="text-sm font-bold tracking-[0.4em] text-amber-200/45">VS</span>
            <SlotName slot={sharedAway} size="xl" />
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
        {game1 ? <FinalGameCard game={game1} /> : null}
        {game2 ? <FinalGameCard game={game2} /> : null}
      </div>
    </div>
  );
}
