"use client";

import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { TIERS } from "@/lib/roster";
import type { ClanMemberRow } from "@/lib/clan-member-api";
import type { Race } from "@prisma/client";
import { RP_ROUTES } from "@/lib/site-routes";
import Link from "next/link";
import { useCallback, useState } from "react";

type MemberForm = {
  nickname: string;
  race: Race;
  tier: number;
};

const emptyForm = (): MemberForm => ({
  nickname: "",
  race: "P",
  tier: 1,
});

const tierColors: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-200",
  2: "bg-red-500/20 text-red-200",
  3: "bg-pink-500/20 text-pink-200",
  4: "bg-blue-500/20 text-blue-200",
  5: "bg-green-500/20 text-green-200",
};

function MemberFields({
  form,
  onChange,
}: {
  form: MemberForm;
  onChange: (form: MemberForm) => void;
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
    </div>
  );
}

export function ClanTierRosterManager({
  initialMembers,
}: {
  initialMembers: ClanMemberRow[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<MemberForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MemberForm>(emptyForm);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/clan-members");
    if (!response.ok) return;
    const json = (await response.json()) as { members: ClanMemberRow[] };
    setMembers(json.members);
  }, []);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/clan-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        members?: ClanMemberRow[];
      };
      if (!response.ok) {
        setError(json.error ?? `추가에 실패했습니다. (${response.status})`);
        return;
      }
      if (json.members) setMembers(json.members);
      setMessage(`${addForm.nickname} 클랜원이 추가되었습니다.`);
      setIsAdding(false);
      setAddForm(emptyForm());
    } catch {
      setError("추가 중 오류가 발생했습니다. Discord 로그인 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(memberId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/clan-members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        members?: ClanMemberRow[];
      };
      if (!response.ok) {
        setError(json.error ?? "수정에 실패했습니다.");
        return;
      }
      if (json.members) setMembers(json.members);
      setMessage(`${editForm.nickname} 클랜원 정보가 수정되었습니다.`);
      setEditingId(null);
    } catch {
      setError("수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(member: ClanMemberRow) {
    if (!confirm(`${member.nickname} 클랜원을 명단에서 제거할까요?`)) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/clan-members/${member.id}`, {
        method: "DELETE",
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        members?: ClanMemberRow[];
      };
      if (!response.ok) {
        setError(json.error ?? "제거에 실패했습니다.");
        return;
      }
      if (json.members) setMembers(json.members);
      setMessage(`${member.nickname} 클랜원이 명단에서 제거되었습니다.`);
      setEditingId(null);
    } catch {
      setError("제거 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(member: ClanMemberRow) {
    setEditingId(member.id);
    setEditForm({
      nickname: member.nickname,
      race: member.race as Race,
      tier: member.tier,
    });
    setIsAdding(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">총 {members.length}명</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            새로고침
          </button>
          <Link
            href={RP_ROUTES.tiers}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            클랜원 명단 보기
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setAddForm(emptyForm());
            }}
            className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 text-sm text-[var(--accent)]"
          >
            클랜원 추가
          </button>
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

      {isAdding ? (
        <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 font-semibold">클랜원 추가</h3>
          <MemberFields form={addForm} onChange={setAddForm} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleAdd()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map((tier) => {
          const tierMembers = members.filter((member) => member.tier === tier);
          if (tierMembers.length === 0) return null;

          return (
            <section
              key={tier}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--card-border)] px-4 py-3">
                <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${tierColors[tier]}`}>
                  {tier}티어
                </span>
              </div>
              <ul className="divide-y divide-[var(--card-border)]/60">
                {tierMembers.map((member) => (
                  <li key={member.id} className="px-4 py-3">
                    {editingId === member.id ? (
                      <div className="space-y-3">
                        <MemberFields form={editForm} onChange={setEditForm} />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleUpdate(member.id)}
                            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">{member.nickname}</span>
                          <span className="ml-2 text-[var(--muted)]">{member.race}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="rounded border border-[var(--card-border)] px-2 py-1 text-xs hover:border-[var(--accent)]"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(member)}
                            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                          >
                            제거
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {members.length === 0 ? (
        <p className="mt-6 text-center text-[var(--muted)]">등록된 클랜원이 없습니다.</p>
      ) : null}
    </div>
  );
}
