"use client";

import { MapSelect } from "@/components/MapSelect";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
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

type SetRow = {
  id: string;
  orderIndex: number;
  tierBracket: string;
  mapName: string | null;
  hasResult: boolean;
  defaults: {
    homePlayerId: string | null;
    awayPlayerId: string | null;
  };
  current: {
    homePlayerId: string | null;
    awayPlayerId: string | null;
    winnerSide: "home" | "away" | null;
  };
};

type ResultsResponse = {
  match: {
    id: string;
    week: number;
    round: number;
    scheduledAt: string | null;
    bjName: string | null;
    status: string;
    homeTeam: { id: string; name: string; color: string; players: PlayerOption[] };
    awayTeam: { id: string; name: string; color: string; players: PlayerOption[] };
    sets: SetRow[];
  };
  entryPublished: boolean;
};

type SetSelection = {
  mapName: string;
  homePlayerId: string;
  awayPlayerId: string;
  winnerSide: "home" | "away" | "";
};

function formatDate(date: string | null) {
  if (!date) return "-";
  const value = new Date(date);
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function playerLabel(player: PlayerOption) {
  return `${player.nickname} (${player.tier}티어, ${player.race})`;
}

function initSelections(sets: SetRow[]) {
  const map: Record<string, SetSelection> = {};
  for (const set of sets) {
    map[set.id] = {
      mapName: set.mapName ?? "",
      homePlayerId: set.current.homePlayerId ?? set.defaults.homePlayerId ?? "",
      awayPlayerId: set.current.awayPlayerId ?? set.defaults.awayPlayerId ?? "",
      winnerSide: set.current.winnerSide ?? "",
    };
  }
  return map;
}

export function ResultForm({ matchId }: { matchId: string }) {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selections, setSelections] = useState<Record<string, SetSelection>>({});
  const [playedAt, setPlayedAt] = useState("");
  const [bjName, setBjName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSet, setAddingSet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/results/${matchId}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "경기 정보를 불러오지 못했습니다.");
      }

      const resultData = json as ResultsResponse;
      setData(resultData);
      setSelections(initSelections(resultData.match.sets));
      if (resultData.match.scheduledAt) {
        setPlayedAt((prev) => prev || resultData.match.scheduledAt!.slice(0, 10));
      }
      setBjName(resultData.match.bjName ?? "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    fetch(`/api/me?matchId=${matchId}`)
      .then((response) => response.json())
      .then((json: { match?: { canEditResults?: boolean } }) => {
        setCanEdit(Boolean(json.match?.canEditResults));
      })
      .catch(() => setCanEdit(false));
  }, [matchId]);

  function updateSelection(setId: string, patch: Partial<SetSelection>) {
    setSelections((prev) => ({
      ...prev,
      [setId]: { ...prev[setId], ...patch },
    }));
  }

  async function handleSave() {
    if (!data) return;

    const results = data.match.sets
      .map((set) => {
        const selection = selections[set.id];
        if (!selection) return null;

        const hasMap = selection.mapName.trim().length > 0;
        const isComplete =
          selection.homePlayerId && selection.awayPlayerId && selection.winnerSide;

        if (!hasMap && !isComplete) {
          return null;
        }

        return {
          setId: set.id,
          mapName: selection.mapName.trim(),
          ...(isComplete
            ? {
                homePlayerId: selection.homePlayerId,
                awayPlayerId: selection.awayPlayerId,
                winnerSide: selection.winnerSide as "home" | "away",
              }
            : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (results.length === 0 && !bjName.trim()) {
      setError("맵, 선수, 승자 또는 BJ명 중 하나 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/results/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          playedAt: playedAt ? new Date(playedAt).toISOString() : undefined,
          bjName,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "저장에 실패했습니다.");
      }

      const resultData = json as ResultsResponse;
      setData(resultData);
      setSelections(initSelections(resultData.match.sets));
      const savedResults = results.filter((r) => "winnerSide" in r && r.winnerSide).length;
      setMessage(
        savedResults > 0
          ? `${savedResults}개 세트 결과가 저장되었습니다.`
          : "맵 정보가 저장되었습니다.",
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const { homeWins, awayWins } = useMemo(() => {
    let home = 0;
    let away = 0;

    if (!data) {
      return { homeWins: home, awayWins: away };
    }

    for (const set of data.match.sets) {
      const winnerSide = selections[set.id]?.winnerSide;
      if (winnerSide === "home") home += 1;
      else if (winnerSide === "away") away += 1;
    }

    return { homeWins: home, awayWins: away };
  }, [data, selections]);

  const hasAceSet = data?.match.sets.some((set) => set.tierBracket === "ACE") ?? false;

  const canAddAceSet = useMemo(() => {
    if (!data || hasAceSet) return false;

    let home = 0;
    let away = 0;

    for (const set of data.match.sets) {
      if (set.tierBracket === "ACE") continue;
      const winnerSide = selections[set.id]?.winnerSide;
      if (winnerSide === "home") home += 1;
      else if (winnerSide === "away") away += 1;
    }

    return home === away && home >= 3;
  }, [data, selections, hasAceSet]);

  async function handleAddAceSet() {
    setAddingSet(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/results/${matchId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierBracket: "ACE" }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "세트 추가에 실패했습니다.");
      }

      const resultData = json as ResultsResponse;
      setData(resultData);
      setSelections(initSelections(resultData.match.sets));
      setMessage("에이스결정전 세트가 추가되었습니다.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "세트 추가에 실패했습니다.");
    } finally {
      setAddingSet(false);
    }
  }

  if (loading && !data) {
    return <p className="text-[var(--muted)]">경기 정보를 불러오는 중...</p>;
  }

  if (!data) {
    return <p className="text-red-400">{error ?? "경기 정보를 불러오지 못했습니다."}</p>;
  }

  const { match, entryPublished } = data;
  const hasScore = homeWins > 0 || awayWins > 0;

  return (
    <div className="space-y-6">
      <Link href="/results" className="inline-block text-sm text-[var(--accent)] hover:underline">
        ← 경기결과 목록
      </Link>

      {!canEdit ? (
        <p className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          조회만 가능합니다. 경기결과 수정은 해당 경기 팀장·부팀장 또는 운영진만 할 수 있습니다.
        </p>
      ) : null}

      <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h3 className="text-lg font-bold">
          <span style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</span>
          {" vs "}
          <span style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</span>
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {match.week}주차 ({match.round}R) · {formatDate(match.scheduledAt)}
        </p>
        {hasScore ? (
          <p className="mt-3 text-base font-semibold">
            <span className="text-[var(--muted)]">최종 스코어 </span>
            <span style={{ color: match.homeTeam.color }}>{homeWins}</span>
            <span className="mx-1.5 text-[var(--muted)]">:</span>
            <span style={{ color: match.awayTeam.color }}>{awayWins}</span>
          </p>
        ) : null}
      </article>

      {entryPublished ? (
        <p className="text-sm text-emerald-300">
          공개된 엔트리 선수가 기본값으로 채워졌습니다. 승자만 선택해 주세요.
        </p>
      ) : null}

      <fieldset disabled={!canEdit} className="flex flex-wrap gap-4 disabled:opacity-60">
        <label className="flex flex-col gap-1 text-sm">
          BJ명
          <input
            type="text"
            value={bjName}
            onChange={(event) => setBjName(event.target.value)}
            placeholder="BJ 닉네임"
            className={`w-48 ${FORM_SELECT_CLASS}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          경기 일자
          <input
            type="date"
            value={playedAt}
            onChange={(event) => setPlayedAt(event.target.value)}
            className={`w-fit ${FORM_SELECT_CLASS}`}
          />
        </label>
      </fieldset>

      <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-60">
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">세트</th>
              <th className="px-4 py-3 font-medium">맵</th>
              <th className="px-4 py-3 font-medium" style={{ color: match.homeTeam.color }}>
                {match.homeTeam.name}
              </th>
              <th className="px-4 py-3 font-medium" style={{ color: match.awayTeam.color }}>
                {match.awayTeam.name}
              </th>
              <th className="px-4 py-3 font-medium">승자</th>
            </tr>
          </thead>
          <tbody>
            {match.sets.map((set) => {
              const selection = selections[set.id] ?? {
                mapName: "",
                homePlayerId: "",
                awayPlayerId: "",
                winnerSide: "" as const,
              };

              return (
                <tr
                  key={set.id}
                  className="border-b border-[var(--card-border)]/60 last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--foreground)]">
                      {getTierBracketLabel(set.tierBracket)}
                    </span>
                    {set.hasResult ? (
                      <span className="ml-2 text-xs text-[var(--accent)]">저장됨</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <MapSelect
                      value={selection.mapName}
                      onChange={(value) => updateSelection(set.id, { mapName: value })}
                      className={`w-full min-w-[140px] ${FORM_SELECT_CLASS}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={selection.homePlayerId}
                      onChange={(event) =>
                        updateSelection(set.id, { homePlayerId: event.target.value })
                      }
                      className={`w-full ${FORM_SELECT_CLASS}`}
                    >
                      <option value="">선수 선택</option>
                      {match.homeTeam.players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {playerLabel(player)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={selection.awayPlayerId}
                      onChange={(event) =>
                        updateSelection(set.id, { awayPlayerId: event.target.value })
                      }
                      className={`w-full ${FORM_SELECT_CLASS}`}
                    >
                      <option value="">선수 선택</option>
                      {match.awayTeam.players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {playerLabel(player)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!selection.homePlayerId || !selection.awayPlayerId}
                        onClick={() => updateSelection(set.id, { winnerSide: "home" })}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          selection.winnerSide === "home"
                            ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                            : "border-[var(--card-border)] hover:border-[var(--accent)]"
                        }`}
                        style={
                          selection.winnerSide === "home"
                            ? undefined
                            : { color: match.homeTeam.color }
                        }
                      >
                        홈 승
                      </button>
                      <button
                        type="button"
                        disabled={!selection.homePlayerId || !selection.awayPlayerId}
                        onClick={() => updateSelection(set.id, { winnerSide: "away" })}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          selection.winnerSide === "away"
                            ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                            : "border-[var(--card-border)] hover:border-[var(--accent)]"
                        }`}
                        style={
                          selection.winnerSide === "away"
                            ? undefined
                            : { color: match.awayTeam.color }
                        }
                      >
                        어웨이 승
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || saving || addingSet}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          결과 저장
        </button>
        {canAddAceSet ? (
          <button
            type="button"
            onClick={handleAddAceSet}
            disabled={!canEdit || saving || addingSet}
            className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:opacity-50"
          >
            {addingSet ? "추가 중..." : "+ 에이스결정전 세트 추가"}
          </button>
        ) : null}
      </div>
      </fieldset>

      {!hasAceSet ? (
        <p className="text-xs text-[var(--muted)]">
          3:3 동점일 때 에이스결정전 세트를 추가할 수 있습니다.
        </p>
      ) : null}

      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
