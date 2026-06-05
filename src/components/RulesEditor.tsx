"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RulesResponse = {
  seasonId: string;
  seasonName: string;
  rulesText: string;
};

export function RulesEditor({ initialData }: { initialData: RulesResponse }) {
  const [rulesText, setRulesText] = useState(initialData.rulesText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const response = await fetch("/api/rules");
    if (!response.ok) {
      throw new Error("규정을 불러오지 못했습니다.");
    }

    const json = (await response.json()) as RulesResponse;
    setRulesText(json.rulesText);
  }, []);

  useEffect(() => {
    setRulesText(initialData.rulesText);
  }, [initialData.rulesText]);

  async function handleSave() {
    if (!rulesText.trim()) {
      setError("규정 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulesText }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "저장에 실패했습니다.");
      }

      setRulesText(json.rulesText);
      setMessage("규정이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await loadRules();
      setMessage("최신 내용으로 다시 불러왔습니다.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "불러오기에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {initialData.seasonName} 시즌 규정을 수정합니다. (로그인 없음 — 추후 권한 추가)
      </p>

      <textarea
        value={rulesText}
        onChange={(event) => setRulesText(event.target.value)}
        rows={28}
        className="w-full rounded-xl border border-[var(--card-border)] bg-black/20 px-4 py-3 font-mono text-sm leading-7 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
      />

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          다시 불러오기
        </button>
        <Link
          href="/rules"
          className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          규정집 보기
        </Link>
      </div>
    </div>
  );
}
