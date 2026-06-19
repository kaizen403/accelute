import Link from "next/link";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { AppShell } from "@/components/shell/AppShell";
import { fetchSuites } from "@/lib/api";

export default async function SuitesPage() {
  let suites: Awaited<ReturnType<typeof fetchSuites>> = [];
  let error: string | null = null;

  try {
    suites = await fetchSuites();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load suites";
  }

  return (
    <AppShell activeNav="suites">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Suites
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Calibration boards for scripted QA scenarios.
        </p>
      </header>

      {error ? (
        <GlassPanel>
          <p className="text-sm text-rose-400">{error}</p>
        </GlassPanel>
      ) : suites.length === 0 ? (
        <GlassPanel>
          <p className="text-sm text-text-secondary">No suites configured.</p>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {suites.map((suite) => (
            <Link key={suite.id} href={`/suites/${suite.id}`}>
              <GlassPanel hover className="h-full">
                <h2 className="text-lg font-medium text-text-primary">
                  {suite.title}
                </h2>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  {suite.repository.owner}/{suite.repository.name}
                </p>
                <p className="mt-3 text-sm text-text-muted">
                  {suite.cases.length} test cases
                </p>
              </GlassPanel>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
