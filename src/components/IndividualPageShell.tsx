import { Nav } from "@/components/Nav";

export async function IndividualPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Nav siteMode="individual" />
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
