import Link from "next/link";
import { notFound } from "next/navigation";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { CalibrationBadge } from "@/components/runs/CalibrationBadge";
import { RunStatusPill } from "@/components/runs/RunStatusPill";
import { AppShell } from "@/components/shell/AppShell";
import { fetchSuiteSummary } from "@/lib/api";

export default async function SuiteBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let summary: Awaited<ReturnType<typeof fetchSuiteSummary>>;
  try {
    summary = await fetchSuiteSummary(id);
  } catch {
    notFound();
  }

  const { suite, cases } = summary;

  return (
    <AppShell activeNav="suites">
      <div className="mb-6">
        <Link
          href="/suites"
          className="text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          ← Suites
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {suite.title}
        </h1>
        <p className="mt-1 font-mono text-sm text-text-secondary">
          {suite.repository.owner}/{suite.repository.name}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map(({ testCase, latestRun, calibration }) => (
          <GlassPanel key={testCase.id} className="flex flex-col">
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className="font-mono text-sm font-medium text-emerald-400">
                {testCase.id}
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs capitalize text-text-muted">
                {testCase.difficulty}
              </span>
            </div>

            <h2 className="text-base font-medium text-text-primary">
              {testCase.title}
            </h2>

            <p className="mt-2 font-mono text-xs text-text-muted">
              {testCase.branchNameHint}
            </p>

            <div className="mt-4 flex-1 space-y-3">
              {latestRun ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <RunStatusPill status={latestRun.status} />
                    {latestRun.verdictStatus ? (
                      <RunStatusPill status={latestRun.verdictStatus} />
                    ) : null}
                  </div>
                  <p className="text-sm text-text-secondary">
                    PR #{latestRun.prNumber} ·{" "}
                    {new Date(latestRun.createdAt).toLocaleDateString()}
                  </p>
                  {calibration ? (
                    <CalibrationBadge
                      expectedVerdict={calibration.expectedVerdict}
                      actualVerdict={calibration.actualVerdict}
                      calibration={calibration.result}
                      className="w-full"
                    />
                  ) : null}
                  <Link
                    href={`/runs/${latestRun.id}`}
                    className="inline-block text-sm text-emerald-400 transition-colors duration-150 hover:text-emerald-300"
                  >
                    View run →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-text-muted">No run on this branch yet.</p>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </AppShell>
  );
}
