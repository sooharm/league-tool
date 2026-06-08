"use client";

import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { actingRoleLabel } from "@/lib/entry";
import type { PlayerRole } from "@prisma/client";
import { getTierBracketLabel } from "@/lib/standings";
import type { Race } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PlayerOption = {
  id: string;
  nickname: string;
  tier: number;
  race: Race;
};

type SetInfo = {
  id: string;
  orderIndex: number;
  tierBracket: string;
  mapName: string | null;
};

type TeamInfo = {
  id: string;
  name: string;
  color: string;
  players: PlayerOption[];
};

type SlotInfo = {
  setId: string;
  playerId: string;
  player: PlayerOption;
};

type EntryResponse = {
  entry: {
    id: string;
    homeConfirmedAt: string | null;
    awayConfirmedAt: string | null;
    publishedAt: string | null;
    homeConfirmedBy: string | null;
    awayConfirmedBy: string | null;
    status: string;
  };
  match: {
    id: string;
    week: number;
    round: number;
    scheduledAt: string | null;
    homeTeam: TeamInfo;
    awayTeam: TeamInfo;
    sets: SetInfo[];
  };
  slots: {
    home: SlotInfo[] | null;
    away: SlotInfo[] | null;
    homeHidden: boolean;
    awayHidden: boolean;
  };
  permissions: {
    isAdmin: boolean;
    canEditHome: boolean;
    canEditAway: boolean;
    canSave: boolean;
    canConfirm: boolean;
    canResetHome: boolean;
    canResetAway: boolean;
    viewOnly: boolean;
    needsSelection: boolean;
    isPublic: boolean;
  };
};

function formatDate(date: string | null) {
  if (!date) return "-";
  const value = new Date(date);
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function formatDateTime(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playerLabel(player: PlayerOption) {
  return `${player.nickname} (${player.tier}티어, ${player.race})`;
}

function slotsToMap(slots: SlotInfo[] | null) {
  const map: Record<string, string> = {};
  if (!slots) return map;
  for (const slot of slots) {
    map[slot.setId] = slot.playerId;
  }
  return map;
}

function mapToSlots(map: Record<string, string>) {
  return Object.entries(map)
    .filter(([, playerId]) => playerId)
    .map(([setId, playerId]) => ({ setId, playerId }));
}


type MeResponse = {
  loggedIn: boolean;
  isAdmin?: boolean;
  isStaff?: boolean;
  player: { nickname: string; role: PlayerRole; teamId: string } | null;
};

export function EntryForm({ matchId }: { matchId: string }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [data, setData] = useState<EntryResponse | null>(null);
  const [homeSelections, setHomeSelections] = useState<Record<string, string>>({});
  const [awaySelections, setAwaySelections] = useState<Record<string, string>>({});
  const [confirmedBy, setConfirmedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminResetTeamId, setAdminResetTeamId] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/entry/${matchId}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "엔트리를 불러오지 못했습니다.");
      }

      const entryData = json as EntryResponse;
      setData(entryData);
      setHomeSelections(slotsToMap(entryData.slots.home));
      setAwaySelections(slotsToMap(entryData.slots.away));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void fetchEntry();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchEntry]);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((json) => setMe(json as MeResponse))
      .catch(() => setMe({ loggedIn: false, player: null }));
  }, []);

  useEffect(() => {
    if (me?.player?.nickname) {
      setConfirmedBy(me.player.nickname);
    } else if (me?.isAdmin) {
      setConfirmedBy("관리자");
    }
  }, [me?.player, me?.isAdmin]);

  const adminEditingBoth = Boolean(
    data?.permissions.isAdmin &&
      data.permissions.canEditHome &&
      data.permissions.canEditAway,
  );

  const editingTeamId = useMemo(() => {
    if (!data || adminEditingBoth) return null;
    if (data.permissions.canEditHome) return data.match.homeTeam.id;
    if (data.permissions.canEditAway) return data.match.awayTeam.id;
    return null;
  }, [data, adminEditingBoth]);

  const resetTarget = useMemo(() => {
    if (!data) return null;

    if (editingTeamId) {
      const team =
        editingTeamId === data.match.homeTeam.id
          ? data.match.homeTeam
          : data.match.awayTeam;
      const canReset =
        editingTeamId === data.match.homeTeam.id
          ? data.permissions.canResetHome
          : data.permissions.canResetAway;
      return canReset ? team : null;
    }

    if (adminEditingBoth) {
      const teamId = adminResetTeamId ?? data.match.homeTeam.id;
      if (teamId === data.match.homeTeam.id && data.permissions.canResetHome) {
        return data.match.homeTeam;
      }
      if (teamId === data.match.awayTeam.id && data.permissions.canResetAway) {
        return data.match.awayTeam;
      }
      if (data.permissions.canResetHome) return data.match.homeTeam;
      if (data.permissions.canResetAway) return data.match.awayTeam;
    }

    return null;
  }, [data, editingTeamId, adminEditingBoth, adminResetTeamId]);

  useEffect(() => {
    if (!data?.permissions.isAdmin) return;
    setAdminResetTeamId((current) => current ?? data.match.homeTeam.id);
  }, [data?.match.homeTeam.id, data?.permissions.isAdmin]);

  async function persistTeamSlots(
    teamId: string,
    selections: Record<string, string>,
  ): Promise<EntryResponse> {
    const response = await fetch(`/api/entry/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        slots: mapToSlots(selections),
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "저장에 실패했습니다.");
    }

    return json as EntryResponse;
  }

  async function persistSlots(): Promise<EntryResponse> {
    if (!data) {
      throw new Error("저장할 팀 정보가 없습니다.");
    }

    if (adminEditingBoth) {
      let last = await persistTeamSlots(data.match.homeTeam.id, homeSelections);
      applyEntryResponse(last);
      last = await persistTeamSlots(data.match.awayTeam.id, awaySelections);
      return last;
    }

    if (!editingTeamId) {
      throw new Error("저장할 팀 정보가 없습니다.");
    }

    const selections =
      editingTeamId === data.match.homeTeam.id ? homeSelections : awaySelections;

    return persistTeamSlots(editingTeamId, selections);
  }

  function applyEntryResponse(entryData: EntryResponse) {
    setData(entryData);
    setHomeSelections(slotsToMap(entryData.slots.home));
    setAwaySelections(slotsToMap(entryData.slots.away));
  }

  async function handleSave() {
    if (!adminEditingBoth && !editingTeamId) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const entryData = await persistSlots();
      applyEntryResponse(entryData);
      setMessage("임시 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmTeam(teamId: string, selections: Record<string, string>) {
    const savedData = await persistTeamSlots(teamId, selections);
    applyEntryResponse(savedData);

    const response = await fetch(`/api/entry/${matchId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        confirmedBy: confirmedBy.trim(),
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "확정에 실패했습니다.");
    }

    applyEntryResponse(json as EntryResponse);
  }

  async function handleResetClick() {
    if (!data || !resetTarget) return;

    const { id: teamId, name: teamName } = resetTarget;

    if (
      !confirm(
        adminEditingBoth
          ? `${teamName} 엔트리를 초기화할까요?\n작성한 선수 지정과 확정 상태가 모두 사라집니다.`
          : "엔트리를 초기화할까요?\n작성한 선수 지정과 확정 상태가 모두 사라집니다.",
      )
    ) {
      return;
    }

    await handleReset(teamId, teamName);
  }

  async function handleReset(teamId: string, teamName: string) {

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/entry/${matchId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "초기화에 실패했습니다.");
      }

      const entryData = json as EntryResponse;
      applyEntryResponse(entryData);

      if (teamId === entryData.match.homeTeam.id) {
        setHomeSelections({});
      } else {
        setAwaySelections({});
      }

      setMessage(`${teamName} 엔트리가 초기화되었습니다.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "초기화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!data || !confirmedBy.trim()) return;
    if (!adminEditingBoth && !editingTeamId) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      if (adminEditingBoth) {
        if (data.permissions.canEditHome) {
          await confirmTeam(data.match.homeTeam.id, homeSelections);
        }
        if (data.permissions.canEditAway) {
          await confirmTeam(data.match.awayTeam.id, awaySelections);
        }
        setMessage("양팀 엔트리가 확정되었습니다.");
      } else {
        await confirmTeam(editingTeamId!, selectionsForTeam(editingTeamId!));
        setMessage("엔트리가 확정되었습니다.");
      }
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "확정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function selectionsForTeam(teamId: string) {
    if (!data) return {};
    return teamId === data.match.homeTeam.id ? homeSelections : awaySelections;
  }

  function renderPlayerCell(
    team: TeamInfo,
    set: SetInfo,
    selections: Record<string, string>,
    setSelections: (value: Record<string, string>) => void,
    hidden: boolean,
    canEdit: boolean,
    slotList: SlotInfo[] | null,
  ) {
    const setId = set.id;
    if (hidden) {
      return (
        <span className="text-sm text-[var(--muted)]">
          🔒 상대팀 엔트리 (확정 후 공개)
        </span>
      );
    }

    if (canEdit) {
      return (
        <select
          value={selections[setId] ?? ""}
          onChange={(event) =>
            setSelections({ ...selections, [setId]: event.target.value })
          }
          className={`w-full ${FORM_SELECT_CLASS}`}
        >
          <option value="">선수 선택</option>
          {(team.players ?? []).map((player) => (
            <option key={player.id} value={player.id}>
              {playerLabel(player)}
            </option>
          ))}
        </select>
      );
    }

    const slot = slotList?.find((item) => item.setId === setId);
    const selectedPlayer =
      slot?.player ?? team.players.find((player) => player.id === selections[setId]);

    return (
      <span className="text-sm">
        {selectedPlayer ? (
          playerLabel(selectedPlayer)
        ) : (
          <span className="text-[var(--muted)]">미지정</span>
        )}
      </span>
    );
  }

  if (loading && !data) {
    return <p className="text-[var(--muted)]">엔트리를 불러오는 중...</p>;
  }

  if (!data) {
    return <p className="text-red-400">{error ?? "엔트리를 불러오지 못했습니다."}</p>;
  }

  const { entry, match, slots, permissions } = data;
  const published = entry.status === "published";

  if (published) {
    return (
      <div className="space-y-6">
        <Link
          href="/entry"
          className="inline-block text-sm text-[var(--accent)] hover:underline"
        >
          ← 엔트리 목록
        </Link>

        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h3 className="text-lg font-bold">
            <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
            {" vs "}
            <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {match.week}주차 ({match.round}R) · {formatDate(match.scheduledAt)}
          </p>
          {entry.publishedAt ? (
            <p className="mt-2 text-sm text-emerald-300">
              {formatDateTime(entry.publishedAt)} 공개
            </p>
          ) : null}
        </article>

        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm text-emerald-300">
            공개된 엔트리입니다. 경기 중 선수 교체는 경기결과 입력에서 처리합니다.
          </p>
        </section>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
            {entry.homeConfirmedAt ? (
              <span className="ml-2 text-[var(--accent)]">
                ✓ 확정됨 ({formatDateTime(entry.homeConfirmedAt)}
                {entry.homeConfirmedBy ? ` · ${entry.homeConfirmedBy}` : ""})
              </span>
            ) : (
              <span className="ml-2 text-[var(--muted)]">미확정</span>
            )}
          </div>
          <div>
            <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
            {entry.awayConfirmedAt ? (
              <span className="ml-2 text-[var(--accent)]">
                ✓ 확정됨 ({formatDateTime(entry.awayConfirmedAt)}
                {entry.awayConfirmedBy ? ` · ${entry.awayConfirmedBy}` : ""})
              </span>
            ) : (
              <span className="ml-2 text-[var(--muted)]">미확정</span>
            )}
          </div>
        </div>

        {match.sets.length === 0 ? (
          <p className="text-[var(--muted)]">이 경기에 등록된 세트가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
                  <th className="px-4 py-3 font-medium">세트</th>
                  <th className="px-4 py-3 font-medium" style={{ color: match.homeTeam.color }}>
                    {match.homeTeam.name}
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: match.awayTeam.color }}>
                    {match.awayTeam.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {match.sets.map((set) => (
                  <tr
                    key={set.id}
                    className="border-b border-[var(--card-border)]/60 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--foreground)]">
                        {getTierBracketLabel(set.tierBracket)}
                      </span>
                      {set.mapName ? (
                        <span className="ml-1 text-[var(--muted)]">· {set.mapName}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {renderPlayerCell(
                        match.homeTeam,
                        set,
                        homeSelections,
                        setHomeSelections,
                        false,
                        false,
                        slots.home,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {renderPlayerCell(
                        match.awayTeam,
                        set,
                        awaySelections,
                        setAwaySelections,
                        false,
                        false,
                        slots.away,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/entry"
        className="inline-block text-sm text-[var(--accent)] hover:underline"
      >
        ← 엔트리 목록
      </Link>

      <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h3 className="text-lg font-bold">
          <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
          {" vs "}
          <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {match.week}주차 ({match.round}R) · {formatDate(match.scheduledAt)}
        </p>
        <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          <p>
            일정에 등록된 1~6세트(티어·맵)만 엔트리 제출 대상입니다. 7경기 에이스결정전은 3:3일
            때 진행되며 엔트리 대상이 아닙니다.
          </p>
          <p>양팀 모두 엔트리를 확정하면 자동으로 공개됩니다.</p>
          <p>
            한쪽만 확정한 경우에도 상대팀 확정 전까지 엔트리를 수정할 수 있습니다. 전체 공개
            후에는 누구도 엔트리를 수정할 수 없습니다.
          </p>
        </div>
      </article>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        {me?.isAdmin ? (
          <p className="text-[var(--foreground)]">
            관리자 권한으로 양팀 엔트리를 관리할 수 있습니다.
          </p>
        ) : me?.player &&
          (me.player.role === "CAPTAIN" || me.player.role === "VICE_CAPTAIN") &&
          !permissions.needsSelection ? (
          <p className="text-[var(--foreground)]">
            {me.player.nickname} ({actingRoleLabel(me.player.role)})으로 엔트리를 작성합니다.
          </p>
        ) : (
          <p className="text-[var(--muted)]">
            각 팀의 팀장·부팀장만 엔트리 수정이 가능합니다.
            {!me?.loggedIn ? (
              <>
                {" "}
                <Link href="/login" className="text-[var(--accent)] hover:underline">
                  로그인
                </Link>
              </>
            ) : null}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
          {entry.homeConfirmedAt ? (
            <span className="ml-2 text-[var(--accent)]">
              ✓ 확정됨 ({formatDateTime(entry.homeConfirmedAt)}
              {entry.homeConfirmedBy ? ` · ${entry.homeConfirmedBy}` : ""})
            </span>
          ) : (
            <span className="ml-2 text-[var(--muted)]">미확정</span>
          )}
        </div>
        <div>
          <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
          {entry.awayConfirmedAt ? (
            <span className="ml-2 text-[var(--accent)]">
              ✓ 확정됨 ({formatDateTime(entry.awayConfirmedAt)}
              {entry.awayConfirmedBy ? ` · ${entry.awayConfirmedBy}` : ""})
            </span>
          ) : (
            <span className="ml-2 text-[var(--muted)]">미확정</span>
          )}
        </div>
      </div>

      {match.sets.length === 0 ? (
        <p className="text-[var(--muted)]">이 경기에 등록된 세트가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">세트</th>
                <th className="px-4 py-3 font-medium" style={{ color: match.homeTeam.color }}>
                  {match.homeTeam.name}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: match.awayTeam.color }}>
                  {match.awayTeam.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {match.sets.map((set) => (
                <tr
                  key={set.id}
                  className="border-b border-[var(--card-border)]/60 last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--foreground)]">
                      {getTierBracketLabel(set.tierBracket)}
                    </span>
                    {set.mapName ? (
                      <span className="ml-1 text-[var(--muted)]">· {set.mapName}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {renderPlayerCell(
                      match.homeTeam,
                      set,
                      homeSelections,
                      setHomeSelections,
                      slots.homeHidden,
                      permissions.canEditHome &&
                        (adminEditingBoth || editingTeamId === match.homeTeam.id),
                      slots.home,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {renderPlayerCell(
                      match.awayTeam,
                      set,
                      awaySelections,
                      setAwaySelections,
                      slots.awayHidden,
                      permissions.canEditAway &&
                        (adminEditingBoth || editingTeamId === match.awayTeam.id),
                      slots.away,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {permissions.canSave ? (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              확정자 표시
              <input
                type="text"
                value={confirmedBy}
                onChange={(event) => setConfirmedBy(event.target.value)}
                className="rounded-lg border border-[var(--card-border)] bg-black/20 px-3 py-2"
                placeholder="예: 팀장"
              />
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              임시 저장
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !confirmedBy.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
            >
              엔트리 확정
            </button>
            {adminEditingBoth && resetTarget ? (
              <label className="flex flex-col gap-1 text-sm">
                초기화 대상
                <select
                  value={adminResetTeamId ?? match.homeTeam.id}
                  onChange={(event) => setAdminResetTeamId(event.target.value)}
                  className={FORM_SELECT_CLASS}
                >
                  {permissions.canResetHome ? (
                    <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                  ) : null}
                  {permissions.canResetAway ? (
                    <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                  ) : null}
                </select>
              </label>
            ) : null}
            {resetTarget ? (
              <button
                type="button"
                onClick={() => void handleResetClick()}
                disabled={saving}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 transition hover:border-red-400 disabled:opacity-50"
              >
                초기화
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
