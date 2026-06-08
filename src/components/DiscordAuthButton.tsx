import { signIn, signOut } from "@/auth";
import type { Session } from "next-auth";
import Link from "next/link";

export function DiscordAuthButton({ session }: { session: Session | null }) {
  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 transition hover:border-[var(--card-border)] hover:bg-white/5"
          title="Discord ID 확인"
        >
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 rounded-full border border-[var(--card-border)]"
            />
          ) : null}
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            {session.user.name ?? "Discord"}
          </span>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            로그아웃
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord");
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-[#5865f2]/60 bg-[#5865f2]/15 px-3 py-1.5 text-sm font-medium text-[#c7d2fe] transition hover:border-[#5865f2] hover:bg-[#5865f2]/25"
      >
        Discord 로그인
      </button>
    </form>
  );
}
