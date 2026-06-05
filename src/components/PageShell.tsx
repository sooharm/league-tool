import { Nav } from "@/components/Nav";
import { getActiveSeason } from "@/lib/data";

export async function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const season = await getActiveSeason();

  return (
    <div className="min-h-screen">
      <Nav seasonName={season?.name ?? "리그"} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          {description ? <p className="mt-2 text-[var(--muted)]">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
