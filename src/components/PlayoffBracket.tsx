import type {
  FinalsBracketView,
  PlayoffMatchupView,
  PlayoffSlot,
  SuperAceView,
} from "@/lib/playoff-bracket";

function TopLine({ color }: { color: "amber" | "fuchsia" | "yellow" }) {
  const via =
    color === "fuchsia"
      ? "via-fuchsia-300/70"
      : color === "yellow"
        ? "via-yellow-200/60"
        : "via-amber-300/70";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${via} to-transparent`}
      aria-hidden
    />
  );
}

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
      <TopLine color="amber" />
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

function SuperAceCard({ superAce }: { superAce: SuperAceView }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/15 via-[var(--card)] to-black/30 px-5 py-8 shadow-[0_0_40px_rgba(217,70,239,0.12),inset_0_1px_0_rgba(240,171,252,0.2)] sm:col-span-2 sm:px-8 sm:py-10 lg:col-span-2">
      <TopLine color="fuchsia" />
      <p className="text-center text-sm font-bold tracking-[0.2em] text-fuchsia-200 uppercase sm:text-base">
        슈퍼에이스결정전
        {superAce.scheduledLabel ? (
          <span className="ml-2 font-medium tracking-normal text-fuchsia-100/55 normal-case">
            ({superAce.scheduledLabel})
          </span>
        ) : null}
      </p>

      <div className="mt-8 text-center text-lg sm:text-xl">
        <span style={{ color: superAce.homeTeamColor }}>{superAce.homePlayerName}</span>{" "}
        <span className="font-bold text-fuchsia-100">{superAce.homeLabel}</span>
        <span className="mx-3 text-fuchsia-200/40">vs</span>
        <span style={{ color: superAce.awayTeamColor }}>{superAce.awayPlayerName}</span>{" "}
        <span className="font-bold text-fuchsia-100">{superAce.awayLabel}</span>
      </div>

      {superAce.mapName ? (
        <p className="mt-3 text-center text-sm text-fuchsia-100/60">{superAce.mapName}</p>
      ) : null}

      <p className="mt-5 text-center text-base font-semibold text-fuchsia-100">
        승자{" "}
        <span style={{ color: superAce.winnerTeamColor }}>{superAce.winnerPlayerName}</span>
        <span className="text-fuchsia-100/70"> ({superAce.winnerTeamName})</span>
      </p>
    </article>
  );
}

function ChampionBanner({
  champion,
  seriesRecord,
  opponentName,
}: {
  champion: Extract<PlayoffSlot, { kind: "team" }>;
  seriesRecord: { blowjob: number; opponent: number } | null;
  opponentName: string | null;
}) {
  return (
    <div className="relative mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold tracking-[0.45em] text-yellow-200/80 uppercase">
        Season Champion
      </p>
      <p
        className="mt-3 text-5xl font-black tracking-tight sm:text-6xl"
        style={{
          color: champion.color,
          textShadow: `0 0 40px ${champion.color}88, 0 0 80px ${champion.color}44`,
        }}
      >
        🏆 {champion.name} 우승
      </p>
      {seriesRecord && opponentName ? (
        <p className="mt-4 text-sm text-amber-100/70 sm:text-base">
          결승전 {seriesRecord.blowjob}승 {seriesRecord.opponent}승
          {seriesRecord.blowjob === seriesRecord.opponent ? " · 슈퍼에이스결정전 승리" : ""}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-amber-100/50">축하합니다!</p>
    </div>
  );
}

export function PlayoffBracket({ bracket }: { bracket: FinalsBracketView }) {
  const [game1, game2] = bracket.games;
  const sharedHome = game1?.home.kind === "team" ? game1.home : null;
  const sharedAway = game1?.away.kind === "team" ? game1.away : game1?.away;
  const opponentName = sharedAway?.kind === "team" ? sharedAway.name : null;
  const isChampion = bracket.isComplete && bracket.champion?.kind === "team";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border px-5 py-10 sm:px-10 sm:py-14 ${
        isChampion
          ? "border-yellow-300/50 bg-gradient-to-b from-yellow-500/20 via-[#1a1208] to-[var(--background)] shadow-[0_0_80px_rgba(251,191,36,0.2)]"
          : "border-amber-400/40 bg-gradient-to-b from-amber-600/20 via-[#1a1208] to-[var(--background)] shadow-[0_0_60px_rgba(245,158,11,0.12)]"
      }`}
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />
      {isChampion ? (
        <>
          <div
            className="pointer-events-none absolute top-8 left-[12%] h-2 w-2 rounded-full bg-yellow-200/80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-16 right-[18%] h-1.5 w-1.5 rounded-full bg-orange-300/70"
            aria-hidden
          />
          <TopLine color="yellow" />
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.14),transparent_55%)]"
          aria-hidden
        />
      )}

      <div className="relative text-center">
        {isChampion && bracket.champion?.kind === "team" ? (
          <ChampionBanner
            champion={bracket.champion}
            seriesRecord={bracket.seriesRecord}
            opponentName={opponentName}
          />
        ) : (
          <>
            <p className="text-xs font-semibold tracking-[0.35em] text-amber-300/80 uppercase">
              Season Finals
            </p>
            <h2 className="mt-2 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
              결승전
            </h2>
            <p className="mt-3 text-sm text-amber-100/55 sm:text-base">
              목·금 2경기 · 승자가 우승합니다
            </p>
          </>
        )}
      </div>

      {!isChampion && sharedHome && sharedAway ? (
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
        {bracket.superAce ? <SuperAceCard superAce={bracket.superAce} /> : null}
      </div>
    </div>
  );
}
