"use client";

import { useState } from "react";

export function DiscordIdCopy({ discordUserId }: { discordUserId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(discordUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-black/20 p-4 text-left">
      <p className="text-xs text-[var(--muted)]">
        운영진에게 전달할 Discord ID (로스터 연결용)
      </p>
      <p className="mt-2 break-all font-mono text-sm text-[var(--foreground)]">
        {discordUserId}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        {copied ? "복사됨!" : "ID 복사"}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Discord 앱에서 ID 복사가 안 되어도 여기서 복사해 운영진에게 내면 됩니다.
      </p>
    </div>
  );
}
