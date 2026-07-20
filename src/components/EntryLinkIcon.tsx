import { SEASON4_ROUTES } from "@/lib/site-routes";
import Link from "next/link";

function EntryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

export function EntrySubmitLink({ matchId }: { matchId: string }) {
  return (
    <Link
      href={SEASON4_ROUTES.entryMatch(matchId)}
      title="엔트리제출"
      aria-label="엔트리제출"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/60 bg-[var(--accent)]/15 px-3 py-1.5 text-sm font-semibold text-[var(--accent)] shadow-[0_0_12px_rgba(245,158,11,0.15)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/25 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
    >
      <EntryIcon />
      <span>엔트리제출</span>
    </Link>
  );
}
