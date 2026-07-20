"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EloRecalculateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/elo/recalculate", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(typeof payload.error === "string" ? payload.error : "동기화에 실패했습니다.");
        return;
      }

      setMessage(`${payload.updatedCount ?? 0}명 RP 전체 재동기화 완료`);
      router.refresh();
    } catch {
      setMessage("동기화에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {loading ? "재동기화 중..." : "RP 전체 재동기화 (복구용)"}
      </button>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
