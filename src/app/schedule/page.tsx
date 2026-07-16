import { EntrySubmitLink } from "@/components/EntryLinkIcon";
import { PageShell } from "@/components/PageShell";
import Link from "next/link";
import { getActiveSeason, getScheduleMatches, getSeasonMatches } from "@/lib/data";
import { canManageSchedule, getAuthContext } from "@/lib/permissions";
import { entryPublishContext, getSetEntryPlayers, isPublished } from "@/lib/entry";
import { formatScheduleDate } from "@/lib/match-display";
import { getPlayoffRoundLabel } from "@/lib/playoff-bracket";
import { getTierBracketLabel } from "@/lib/standings";

function formatEntryPlayer(player: { nickname: string; tier: number; race: string }) {
  return `${player.nickname} (${player.tier}티어, ${player.race})`;
}

function hasEntryLink(match: { sets: unknown[] }) {
  return match.sets.length > 0;
}

export default async function SchedulePage() {
  const season = await getActiveSeason();
  const auth = await getAuthContext();
  const matches = season ? await getScheduleMatches(season.id) : [];
  const seasonMatches = season ? await getSeasonMatches(season.id) : [];

  const grouped = matches.reduce<Record<number, typeof matches>>((acc, match) => {
    acc[match.week] ??= [];
    acc[match.week].push(match);
    return acc;
  }, {});

  return (
    <PageShell
      title="일정"
      description="경기 예정 일정과 엔트리를 확인합니다. 결과가 입력되면 이 목록에서 사라집니다."
    >
      {canManageSchedule(auth) ? (
        <div className="mb-6">
          <Link
            href="/schedule/manage"
            className="inline-flex items-center rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            일정 관리 (대진·세트 수정)
          </Link>
        </div>
      ) : null}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-[var(--muted)]">예정된 경기가 없습니다.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekMatches]) => (
              <section key={week}>
                <h3 className="mb-4 text-lg font-semibold text-[var(--accent)]">
                  {week}주차 ({weekMatches[0]?.round}R)
                </h3>
                <div className="space-y-4">
                  {weekMatches.map((match) => {
                    const publishedEntry =
                      match.entry && isPublished(entryPublishContext(match.entry, match))
                        ? match.entry.slots.map((slot) => ({
                            teamId: slot.teamId,
                            setId: slot.setId,
                            playerId: slot.playerId,
                            player: slot.player,
                          }))
                        : null;
                    const playoffLabel = getPlayoffRoundLabel(match, seasonMatches);

                    return (
                      <article
                        key={match.id}
                        className="relative rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 pb-12"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            {playoffLabel ? (
                              <p className="mb-1 text-xs font-semibold tracking-wide text-[var(--accent)]">
                                {playoffLabel}
                              </p>
                            ) : null}
                            <p className="text-lg font-bold">
                              <span style={{ color: match.homeTeam.color }}>
                                {match.homeTeam.name}
                              </span>
                              {" vs "}
                              <span style={{ color: match.awayTeam.color }}>
                                {match.awayTeam.name}
                              </span>
                            </p>
                          </div>
                          <div className="text-sm text-[var(--muted)]">
                            {formatScheduleDate(match.scheduledAt)}
                          </div>
                        </div>

                        {publishedEntry ? (
                          <p className="mt-2 text-xs text-emerald-300">엔트리 공개됨</p>
                        ) : null}

                        {match.sets.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-sm">
                            {match.sets.map((set) => {
                              const entryPlayers = publishedEntry
                                ? getSetEntryPlayers(
                                    set.id,
                                    match.homeTeamId,
                                    match.awayTeamId,
                                    publishedEntry,
                                  )
                                : null;

                              return (
                                <li key={set.id} className="text-[var(--muted)]">
                                  <span className="text-[var(--foreground)]">
                                    {getTierBracketLabel(set.tierBracket)}
                                  </span>
                                  {set.mapName ? ` · ${set.mapName}` : ""}
                                  {entryPlayers?.home || entryPlayers?.away ? (
                                    <>
                                      {" · "}
                                      <span style={{ color: match.homeTeam.color }}>
                                        {entryPlayers.home
                                          ? formatEntryPlayer(entryPlayers.home)
                                          : "미지정"}
                                      </span>
                                      {" vs "}
                                      <span style={{ color: match.awayTeam.color }}>
                                        {entryPlayers.away
                                          ? formatEntryPlayer(entryPlayers.away)
                                          : "미지정"}
                                      </span>
                                      <span className="text-xs text-[var(--muted)]">
                                        {" "}
                                        (엔트리)
                                      </span>
                                    </>
                                  ) : (
                                    " · 미진행"
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}

                        {hasEntryLink(match) ? (
                          <div className="absolute bottom-4 right-4">
                            <EntrySubmitLink matchId={match.id} />
                          </div>
                        ) : null}
                      </article>
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
