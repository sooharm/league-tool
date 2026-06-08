"use client";

import {
  createEmptySet,
  defaultSets,
  MATCH_STATUS_OPTIONS,
  type MatchAdminInput,
} from "@/lib/match-admin";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { getTierBracketLabel, TIER_BRACKET_OPTIONS } from "@/lib/tier-brackets";
import { MapSelect } from "@/components/MapSelect";
import { formatScheduleDate } from "@/lib/match-display";
import type { MatchStatus, TierBracket } from "@prisma/client";
import Link from "next/link";
import { useCallback, useState } from "react";

type TeamOption = { id: string; name: string; color: string };

type MatchSummary = {
  id: string;
  week: number;
  round: number;
  scheduledAt: string | null;
  status: MatchStatus;
  homeTeam: TeamOption;
  awayTeam: TeamOption;
  setCount: number;
  hasResults: boolean;
};

type AdminData = {
  season: { id: string; name: string };
  teams: TeamOption[];
  matches: MatchSummary[];
};

function toDateTimeLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T21:00`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function emptyMatch(teams: TeamOption[]): MatchAdminInput {
  return {
    week: 1,
    round: 1,
    homeTeamId: teams[0]?.id ?? "",
    awayTeamId: teams[1]?.id ?? teams[0]?.id ?? "",
    scheduledAt: null,
    status: "SCHEDULED",
    sets: defaultSets(),
  };
}

export function MatchManager({ initialData }: { initialData: AdminData }) {
  const [data, setData] = useState(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<MatchAdminInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [meta, setMeta] = useState({ hasResults: false, hasEntry: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const response = await fetch("/api/matches");
    const json = await response.json();
    if (response.ok) {
      setData(json as AdminData);
    }
  }, []);

  const loadMatch = useCallback(async (matchId: string) => {
    setError(null);
    const response = await fetch(`/api/matches/${matchId}`);
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "경기를 불러오지 못했습니다.");
    }
    setForm(json.match as MatchAdminInput);
    setMeta(json.meta);
    setSelectedId(matchId);
    setIsNew(false);
  }, []);

  async function handleSelect(matchId: string) {
    try {
      await loadMatch(matchId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "오류가 발생했습니다.");
    }
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setForm(emptyMatch(data.teams));
    setMeta({ hasResults: false, hasEntry: false });
    setMessage(null);
    setError(null);
  }

  function updateForm(patch: Partial<MatchAdminInput>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateSet(index: number, patch: Partial<MatchAdminInput["sets"][number]>) {
    setForm((prev) => {
      if (!prev) return prev;
      const sets = [...prev.sets];
      sets[index] = { ...sets[index], ...patch };
      return { ...prev, sets };
    });
  }

  function addSet() {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: [...prev.sets, createEmptySet(prev.sets.length + 1)],
      };
    });
  }

  function removeSet(index: number) {
    setForm((prev) => {
      if (!prev || prev.sets.length <= 1) return prev;
      const sets = prev.sets
        .filter((_, i) => i !== index)
        .map((set, i) => ({ ...set, orderIndex: i + 1 }));
      return { ...prev, sets };
    });
  }

  function moveSet(index: number, direction: -1 | 1) {
    setForm((prev) => {
      if (!prev) return prev;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.sets.length) {
        return prev;
      }

      const sets = [...prev.sets];
      [sets[index], sets[targetIndex]] = [sets[targetIndex], sets[index]];

      return {
        ...prev,
        sets: sets.map((set, i) => ({ ...set, orderIndex: i + 1 })),
      };
    });
  }

  async function handleSave() {
    if (!form) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const url = isNew ? "/api/matches" : `/api/matches/${selectedId}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "저장에 실패했습니다.");
      }

      await refreshList();

      if (json.matchId) {
        setSelectedId(json.matchId);
        setIsNew(false);
      }
      if (json.match) {
        setForm(json.match as MatchAdminInput);
      }
      if (json.meta) {
        setMeta(json.meta);
      }

      setMessage("저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || isNew) return;
    if (!confirm("이 경기를 삭제할까요? 엔트리·결과도 함께 삭제됩니다.")) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${selectedId}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "삭제에 실패했습니다.");
      }

      setSelectedId(null);
      setForm(null);
      setIsNew(false);
      setMessage("경기가 삭제되었습니다.");
      await refreshList();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const grouped = data.matches.reduce<Record<number, MatchSummary[]>>((acc, match) => {
    acc[match.week] ??= [];
    acc[match.week].push(match);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Link href="/schedule" className="inline-block text-sm text-[var(--accent)] hover:underline">
        ← 일정표
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold">경기 목록</h3>
            <button
              type="button"
              onClick={handleNew}
              className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
            >
              + 새 경기
            </button>
          </div>

          {data.matches.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">등록된 경기가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([week, weekMatches]) => (
                  <div key={week}>
                    <p className="mb-2 text-sm font-medium text-[var(--accent)]">
                      {week}주차
                    </p>
                    <div className="space-y-1">
                      {weekMatches.map((match) => (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => handleSelect(match.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selectedId === match.id && !isNew
                              ? "border-[var(--accent)] bg-[var(--accent)]/10"
                              : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                          }`}
                        >
                          <span style={{ color: match.homeTeam.color }}>
                            {match.homeTeam.name}
                          </span>
                          {" vs "}
                          <span style={{ color: match.awayTeam.color }}>
                            {match.awayTeam.name}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {formatScheduleDate(
                              match.scheduledAt ? new Date(match.scheduledAt) : null,
                            )}{" "}
                            · {match.setCount}세트
                            {match.hasResults ? " · 결과 있음" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          {!form ? (
            <p className="text-sm text-[var(--muted)]">
              경기를 선택하거나 새 경기를 추가해 주세요.
            </p>
          ) : (
            <div className="space-y-5">
              <h3 className="font-semibold">{isNew ? "새 경기 추가" : "경기 수정"}</h3>

              {(meta.hasResults || meta.hasEntry) && !isNew ? (
                <p className="text-xs text-amber-300">
                  {meta.hasResults ? "결과가 있는 경기입니다. " : ""}
                  {meta.hasEntry ? "엔트리가 있는 경기입니다. " : ""}
                  팀을 바꾸면 엔트리·결과가 삭제됩니다.
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  주차
                  <input
                    type="number"
                    min={1}
                    value={form.week}
                    onChange={(e) => updateForm({ week: Number(e.target.value) })}
                    className={FORM_SELECT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  라운드
                  <input
                    type="number"
                    min={1}
                    value={form.round}
                    onChange={(e) => updateForm({ round: Number(e.target.value) })}
                    className={FORM_SELECT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  경기 일시
                  <input
                    type="datetime-local"
                    value={toDateTimeLocal(form.scheduledAt)}
                    onChange={(e) =>
                      updateForm({ scheduledAt: fromDateTimeLocal(e.target.value) })
                    }
                    className={FORM_SELECT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  상태
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateForm({ status: e.target.value as MatchStatus })
                    }
                    className={FORM_SELECT_CLASS}
                  >
                    {MATCH_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  홈팀
                  <select
                    value={form.homeTeamId}
                    onChange={(e) => updateForm({ homeTeamId: e.target.value })}
                    className={FORM_SELECT_CLASS}
                  >
                    {data.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  어웨이팀
                  <select
                    value={form.awayTeamId}
                    onChange={(e) => updateForm({ awayTeamId: e.target.value })}
                    className={FORM_SELECT_CLASS}
                  >
                    {data.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">세트 구성</h4>
                  <button
                    type="button"
                    onClick={addSet}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    + 세트 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {form.sets.map((set, index) => (
                    <div
                      key={set.id ?? `new-${index}`}
                      className="grid gap-2 rounded-lg border border-[var(--card-border)]/60 bg-black/10 p-3 sm:grid-cols-[72px_1fr_1fr_40px]"
                    >
                      <div className="flex flex-col items-center gap-1 self-center">
                        <span className="text-sm font-medium text-[var(--muted)]">
                          {set.orderIndex}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveSet(index, -1)}
                            disabled={index === 0}
                            className="rounded border border-[var(--card-border)] px-1.5 py-0.5 text-xs disabled:opacity-30"
                            title="위로"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSet(index, 1)}
                            disabled={index === form.sets.length - 1}
                            className="rounded border border-[var(--card-border)] px-1.5 py-0.5 text-xs disabled:opacity-30"
                            title="아래로"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                      <select
                        value={set.tierBracket}
                        onChange={(e) =>
                          updateSet(index, { tierBracket: e.target.value as TierBracket })
                        }
                        className={FORM_SELECT_CLASS}
                      >
                        {!(TIER_BRACKET_OPTIONS as { value: string }[]).some(
                          (option) => option.value === set.tierBracket,
                        ) ? (
                          <option value={set.tierBracket}>
                            {getTierBracketLabel(set.tierBracket)} (구)
                          </option>
                        ) : null}
                        {TIER_BRACKET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <MapSelect
                        value={set.mapName ?? ""}
                        onChange={(value) =>
                          updateSet(index, { mapName: value || null })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeSet(index)}
                        disabled={form.sets.length <= 1}
                        className="self-center text-sm text-red-400 disabled:opacity-30"
                        title="세트 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  저장
                </button>
                {!isNew && selectedId ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
                  >
                    경기 삭제
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {message ? <p className="mt-3 text-sm text-[var(--accent)]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
