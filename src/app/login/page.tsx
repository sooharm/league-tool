import { DiscordAuthButton } from "@/components/DiscordAuthButton";
import { DiscordIdCopy } from "@/components/DiscordIdCopy";
import { PageShell } from "@/components/PageShell";
import { auth } from "@/auth";
import { getWalletPoints } from "@/lib/points";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  const points =
    session?.user?.id != null ? await getWalletPoints(session.user.id) : null;

  return (
    <PageShell
      title="로그인"
      description="수정 권한이 있는 분만 Discord 계정으로 로그인합니다. 조회는 로그인 없이 가능합니다."
    >
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
        {session?.user ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              <span className="font-medium text-[var(--foreground)]">
                {session.user.name ?? "Discord 사용자"}
              </span>
              님으로 로그인되어 있습니다.
            </p>
            {session.user.id ? <DiscordIdCopy discordUserId={session.user.id} /> : null}
            {points != null ? (
              <div className="rounded-lg border border-[var(--card-border)] bg-white/5 px-4 py-3">
                <p className="text-xs text-[var(--muted)]">보유 포인트</p>
                <p className="mt-1 text-2xl font-bold text-[var(--accent)]">{points} P</p>
              </div>
            ) : null}
            <DiscordAuthButton session={session} />
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">
              팀장·부팀장·운영진은 Discord 로그인 후 각자 권한에 맞는 기능을 사용할 수 있습니다.
            </p>
            <DiscordAuthButton session={session} />
          </>
        )}
        <Link
          href="/"
          className="inline-block text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          ← 메인으로
        </Link>
      </div>
    </PageShell>
  );
}
