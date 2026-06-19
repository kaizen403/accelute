import { Suspense } from "react";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { RunsFilterBar } from "@/components/runs/RunsFilterBar";
import { RunsRefresh } from "@/components/runs/RunsRefresh";
import { RunsTable } from "@/components/runs/RunsTable";
import { AppShell } from "@/components/shell/AppShell";
import { fetchRuns } from "@/lib/api";

interface HomePageProps {
  searchParams: Promise<{
    status?: string;
    owner?: string;
    repo?: string;
    suite?: string;
    testCase?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  let runs: Awaited<ReturnType<typeof fetchRuns>> = [];
  let error: string | null = null;

  try {
    runs = await fetchRuns({
      status: params.status,
      owner: params.owner,
      repo: params.repo,
      suite: params.suite,
      testCase: params.testCase,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load runs";
  }

  const hasFilters = Boolean(
    params.status ||
      params.owner ||
      params.repo ||
      params.suite ||
      params.testCase,
  );

  return (
    <AppShell activeNav="runs">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Runs
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            PR QA runs, verdicts, and evidence.
          </p>
        </div>
        <RunsRefresh />
      </header>

      <Suspense fallback={null}>
        <RunsFilterBar />
      </Suspense>

      <GlassPanel>
        {error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {hasFilters
              ? "No runs match these filters."
              : "No runs yet. Comment /qa on a pull request to start."}
          </p>
        ) : (
          <RunsTable runs={runs} />
        )}
      </GlassPanel>
    </AppShell>
  );
}
