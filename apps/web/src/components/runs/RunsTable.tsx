import Link from "next/link";

import { RunStatusPill } from "@/components/runs/RunStatusPill";
import type { QaRunSummary } from "@/lib/api";

interface RunsTableProps {
  runs: QaRunSummary[];
}

function VerdictPill({ verdict }: { verdict: string | null }) {
  if (!verdict) {
    return <span className="text-text-muted">—</span>;
  }
  return <RunStatusPill status={verdict} />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsTable({ runs }: RunsTableProps) {
  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-lg border border-glass-border/50 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/runs/${run.id}`}
                  className="font-medium text-text-primary"
                >
                  #{run.prNumber} {run.prTitle}
                </Link>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  {run.repository.owner}/{run.repository.name}
                </p>
              </div>
              <RunStatusPill status={run.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerdictPill verdict={run.verdictStatus} />
              {run.tags ? (
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                  {run.tags.testCaseId}
                </span>
              ) : null}
              <span className="text-xs text-text-muted">
                {formatDate(run.createdAt)}
              </span>
            </div>
            <div className="mt-3 flex gap-3 text-xs">
              <Link href={`/runs/${run.id}`} className="text-emerald-400">
                Detail
              </Link>
              <a href={run.githubPrUrl} target="_blank" rel="noreferrer">
                PR
              </a>
              <a href={run.reportUrl} target="_blank" rel="noreferrer">
                Report
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-text-muted">
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Repo</th>
            <th className="pb-3 pr-4 font-medium">PR</th>
            <th className="pb-3 pr-4 font-medium">Verdict</th>
            <th className="hidden pb-3 pr-4 font-medium lg:table-cell">Confidence</th>
            <th className="pb-3 pr-4 font-medium">Tags</th>
            <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Created</th>
            <th className="pb-3 font-medium">Links</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-glass-border/50 last:border-0"
            >
              <td className="py-3 pr-4">
                <RunStatusPill status={run.status} />
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-text-secondary">
                {run.repository.owner}/{run.repository.name}
              </td>
              <td className="py-3 pr-4">
                <Link
                  href={`/runs/${run.id}`}
                  className="font-medium text-text-primary transition-colors duration-150 hover:text-emerald-400"
                >
                  #{run.prNumber}
                </Link>
                <div className="mt-0.5 max-w-xs truncate text-text-secondary">
                  {run.prTitle}
                </div>
              </td>
              <td className="py-3 pr-4">
                <VerdictPill verdict={run.verdictStatus} />
              </td>
              <td className="hidden py-3 pr-4 text-text-secondary lg:table-cell">
                {run.confidence != null ? `${run.confidence}%` : "—"}
              </td>
              <td className="py-3 pr-4">
                {run.tags ? (
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                      {run.tags.testCaseId}
                    </span>
                  </div>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
              <td className="hidden py-3 pr-4 whitespace-nowrap text-text-secondary sm:table-cell">
                {formatDate(run.createdAt)}
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-emerald-400 transition-colors duration-150 hover:text-emerald-300"
                  >
                    Detail
                  </Link>
                  <a
                    href={run.githubPrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-secondary transition-colors duration-150 hover:text-text-primary"
                  >
                    PR
                  </a>
                  <a
                    href={run.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-secondary transition-colors duration-150 hover:text-text-primary"
                  >
                    Report
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
