import { Nav } from "@/components/Nav";

export function PreseasonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav siteMode="league" />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
