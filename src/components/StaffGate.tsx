import { PageShell } from "@/components/PageShell";
import {
  canManageSchedule,
  canManageStaffTools,
  getAuthContext,
} from "@/lib/permissions";
import Link from "next/link";

export async function StaffGate({
  title,
  description,
  children,
  access = "staff",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  access?: "staff" | "schedule";
}) {
  const auth = await getAuthContext();
  const hasAccess =
    access === "schedule" ? canManageSchedule(auth) : canManageStaffTools(auth);

  if (!auth) {
    return (
      <PageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            {access === "schedule"
              ? "일정 관리는 Discord 로그인 후, 팀장·부팀장 또는 운영진만 이용할 수 있습니다."
              : "운영진 전용 메뉴입니다. Discord로 로그인해 주세요."}
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg border border-[#5865f2]/60 bg-[#5865f2]/15 px-4 py-2 text-sm font-medium text-[#c7d2fe]"
          >
            Discord 로그인
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!hasAccess) {
    return (
      <PageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            {access === "schedule"
              ? "팀장·부팀장 또는 운영진만 접근할 수 있습니다."
              : "운영진만 접근할 수 있습니다."}
          </p>
          {access === "staff" ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              운영진 권한이 없다면 관리자에게 문의하세요.
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">
              로스터에 팀장·부팀장으로 등록되고 Discord 계정이 연결되어 있어야 합니다.
            </p>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={title} description={description}>
      {children}
    </PageShell>
  );
}
