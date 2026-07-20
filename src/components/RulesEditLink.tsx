import { canManageStaffTools, getAuthContext } from "@/lib/permissions";
import { SEASON4_ROUTES } from "@/lib/site-routes";
import Link from "next/link";

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export async function RulesEditLink() {
  const auth = await getAuthContext();
  if (!canManageStaffTools(auth)) {
    return null;
  }

  return (
    <Link
      href={SEASON4_ROUTES.rulesManage}
      title="규정집 수정"
      aria-label="규정집 수정"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/60 bg-[var(--accent)]/15 px-3 py-1.5 text-sm font-semibold text-[var(--accent)] shadow-[0_0_12px_rgba(245,158,11,0.15)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/25 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
    >
      <EditIcon />
      <span>규정집 수정</span>
    </Link>
  );
}
