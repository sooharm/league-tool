"use client";

import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { ROLE_OPTIONS, roleLabel, TIERS } from "@/lib/roster";
import type { PlayerRole, Race } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Player = {
  id: string;
  nickname: string;
  race: Race;
  tier: number;
  role: PlayerRole;
  discordUserId: string | null;
};

type Team = {
  id: string;
  name: string;
  color: string;
  players: Player[];
};

type RosterData = {
  season: { id: string; name: string; teamCount: number };
  teams: Team[];
};

type PlayerForm = {
  nickname: string;
  race: Race;
  tier: number;
  role: PlayerRole;
};

const emptyForm = (): PlayerForm => ({
  nickname: "",
  race: "P",
  tier: 1,
  role: "MEMBER",
});

const tierColors: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-200",
  2: "bg-red-500/20 text-red-200",
  3: "bg-pink-500/20 text-pink-200",
  4: "bg-blue-500/20 text-blue-200",
  5: "bg-green-500/20 text-green-200",
};

function PlayerFields({
  form,
  onChange,
}: {
  form: PlayerForm;
  onChange: (form: PlayerForm) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input
        type="text"
        value={form.nickname}
        onChange={(e) => onChange({ ...form, nickname: e.target.value })}
        placeholder="닉네임"
        className={FORM_SELECT_CLASS}
      />
      <select
        value={form.race}
        onChange={(e) => onChange({ ...form, race: e.target.value as Race })}
        className={FORM_SELECT_CLASS}
      >
        <option value="P">프로토스 (P)</option>
        <option value="T">테란 (T)</option>
        <option value="Z">저그 (Z)</option>
      </select>
      <select
        value={form.tier}
        onChange={(e) => onChange({ ...form, tier: Number(e.target.value) })}
        className={FORM_SELECT_CLASS}
      >
        {TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {tier}티어
          </option>
        ))}
      </select>
      <select
        value={form.role}
        onChange={(e) => onChange({ ...form, role: e.target.value as PlayerRole })}
        className={FORM_SELECT_CLASS}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RosterManager({
  initialData,
  managedTeamId = null,
}: {
  initialData: RosterData;
  managedTeamId?: string | null;
}) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myDiscordId, setMyDiscordId] = useState<string | null>(null);
  const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
  const [manualDiscordId, setManualDiscordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<PlayerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlayerForm>(emptyForm);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameForm, setTeamNameForm] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/roster");
    if (!response.ok) return;
    const json = (await response.json()) as RosterData;
    setData(json);
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((json: { discordUserId?: string }) => {
        setMyDiscordId(json.discordUserId ?? null);
      })
      .catch(() => setMyDiscordId(null));
  }, []);

  async function handleLinkDiscord(playerId: string, discordUserId: string | null) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/roster/players/${playerId}/discord`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUserId }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Discord 연결에 실패했습니다.");
        return;
      }

      await refresh();
      setLinkingPlayerId(null);
      setManualDiscordId("");
      setMessage("Discord 계정이 연결되었습니다.");
    } catch {
      setError("Discord 연결 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(teamId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/roster/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, ...addForm }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "선수 추가에 실패했습니다.");
        return;
      }
      if (json.roster) setData(json.roster);
      setMessage(`${addForm.nickname} 선수가 추가되었습니다.`);
      setAddingTeamId(null);
      setAddForm(emptyForm());
    } catch {
      setError("선수 추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(playerId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/roster/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "수정에 실패했습니다.");
        return;
      }
      if (json.roster) setData(json.roster);
      setMessage(`${editForm.nickname} 선수 정보가 수정되었습니다.`);
      setEditingId(null);
    } catch {
      setError("수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(player: Player) {
    if (!confirm(`${player.nickname} 선수를 삭제할까요?`)) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/roster/players/${player.id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      if (json.roster) setData(json.roster);
      setMessage(
        json.softDeleted
          ? `${player.nickname} 선수가 비활성화되었습니다. (경기 기록 보존)`
          : `${player.nickname} 선수가 삭제되었습니다.`,
      );
      setEditingId(null);
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditForm({
      nickname: player.nickname,
      race: player.race,
      tier: player.tier,
      role: player.role,
    });
    setAddingTeamId(null);
    setEditingTeamId(null);
  }

  function startTeamNameEdit(team: Team) {
    setEditingTeamId(team.id);
    setTeamNameForm(team.name);
    setAddingTeamId(null);
    setEditingId(null);
  }

  async function handleTeamNameUpdate(teamId: string) {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/roster/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamNameForm }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "팀명 수정에 실패했습니다.");
        return;
      }

      if (json.roster) setData(json.roster);
      setEditingTeamId(null);
      setMessage(`팀명이 "${json.team.name}"(으)로 변경되었습니다.`);
    } catch {
      setError("팀명 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const visibleTeams = managedTeamId
    ? data.teams.filter((team) => team.id === managedTeamId)
    : data.teams;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {data.season.name} · {visibleTeams.length}개 팀
          {managedTeamId ? " (내 팀)" : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            새로고침
          </button>
          <Link
            href="/roster"
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            로스터 보기
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleTeams.map((team) => (
          <section
            key={team.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          >
            <div
              className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3"
              style={{ color: team.color }}
            >
              {editingTeamId === team.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={teamNameForm}
                    onChange={(event) => setTeamNameForm(event.target.value)}
                    maxLength={50}
                    className={`min-w-0 flex-1 ${FORM_SELECT_CLASS}`}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleTeamNameUpdate(team.id)}
                    className="rounded border border-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent)] disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTeamId(null)}
                    className="rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--foreground)]"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-bold">{team.name}</span>
                  <button
                    type="button"
                    onClick={() => startTeamNameEdit(team)}
                    className="shrink-0 rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--foreground)] hover:border-[var(--accent)]"
                  >
                    팀명 수정
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setAddingTeamId(team.id);
                  setAddForm(emptyForm());
                  setEditingId(null);
                  setEditingTeamId(null);
                }}
                className="shrink-0 rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--foreground)] hover:border-[var(--accent)]"
              >
                + 선수
              </button>
            </div>

            <div className="divide-y divide-[var(--card-border)]/60">
              {TIERS.map((tier) => {
                const players = team.players.filter((player) => player.tier === tier);
                if (players.length === 0 && addingTeamId !== team.id) return null;

                return (
                  <div key={tier} className="px-4 py-3">
                    <p className={`mb-2 inline-block rounded px-2 py-0.5 text-xs ${tierColors[tier]}`}>
                      {tier}티어
                    </p>
                    <ul className="space-y-2 text-sm">
                      {players.map((player) =>
                        editingId === player.id ? (
                          <li key={player.id} className="space-y-2 rounded-lg border border-[var(--card-border)] p-3">
                            <PlayerFields form={editForm} onChange={setEditForm} />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void handleUpdate(player.id)}
                                className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs"
                              >
                                취소
                              </button>
                            </div>
                          </li>
                        ) : (
                          <li key={player.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                            <span className={player.role !== "MEMBER" ? "text-red-300" : ""}>
                              {player.nickname}({player.race}
                              {roleLabel(player.role) ? `, ${roleLabel(player.role)}` : ""})
                            </span>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(player)}
                                className="rounded border border-[var(--card-border)] px-2 py-0.5 text-xs hover:border-[var(--accent)]"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(player)}
                                className="rounded border border-red-500/40 px-2 py-0.5 text-xs text-red-300 hover:border-red-400"
                              >
                                삭제
                              </button>
                            </div>
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              Discord: {player.discordUserId ? `연결됨 (${player.discordUserId})` : "미연결"}
                            </div>
                            {linkingPlayerId === player.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={manualDiscordId}
                                  onChange={(event) => setManualDiscordId(event.target.value)}
                                  placeholder="Discord User ID"
                                  className={`w-48 ${FORM_SELECT_CLASS}`}
                                />
                                {myDiscordId ? (
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => void handleLinkDiscord(player.id, myDiscordId)}
                                    className="rounded border border-[var(--accent)]/60 px-2 py-0.5 text-xs text-[var(--accent)]"
                                  >
                                    내 계정 연결
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() =>
                                    void handleLinkDiscord(
                                      player.id,
                                      manualDiscordId.trim() || null,
                                    )
                                  }
                                  className="rounded border border-[var(--card-border)] px-2 py-0.5 text-xs"
                                >
                                  저장
                                </button>
                                {player.discordUserId ? (
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => void handleLinkDiscord(player.id, null)}
                                    className="rounded border border-red-500/40 px-2 py-0.5 text-xs text-red-300"
                                  >
                                    해제
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLinkingPlayerId(null);
                                    setManualDiscordId("");
                                  }}
                                  className="rounded border border-[var(--card-border)] px-2 py-0.5 text-xs"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkingPlayerId(player.id);
                                  setManualDiscordId(player.discordUserId ?? "");
                                }}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Discord 연결
                              </button>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                );
              })}

              {addingTeamId === team.id ? (
                <div className="space-y-3 px-4 py-3">
                  <p className="text-sm font-medium text-[var(--accent)]">선수 추가</p>
                  <PlayerFields form={addForm} onChange={setAddForm} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleAdd(team.id)}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingTeamId(null)}
                      className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : null}

              {team.players.length === 0 && addingTeamId !== team.id ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                  등록된 선수가 없습니다.
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
