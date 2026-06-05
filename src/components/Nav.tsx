import { DiscordAuthButton } from "@/components/DiscordAuthButton";
import { auth } from "@/auth";
import Link from "next/link";

const links = [
  { href: "/entry", label: "금일의 엔트리" },
  { href: "/", label: "팀 순위" },
  { href: "/players", label: "개인 순위" },
  { href: "/schedule", label: "일정" },
  { href: "/results", label: "경기결과" },
  { href: "/db", label: "DB" },
  { href: "/roster", label: "로스터" },
  { href: "/rules", label: "규정집" },
];

export async function Nav({ seasonName }: { seasonName: string }) {
  const session = await auth();

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">스타리그 팀리그</p>
            <h1 className="text-xl font-bold text-[var(--accent)]">{seasonName}</h1>
          </div>
          <DiscordAuthButton session={session} />
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
