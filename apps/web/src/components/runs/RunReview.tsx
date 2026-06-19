import Link from "next/link";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { CalibrationBadge } from "@/components/runs/CalibrationBadge";
import { RunStatusPill } from "@/components/runs/RunStatusPill";
import type { QaRunDetail } from "@/lib/api";

interface RunReviewProps {
  run: QaRunDetail;
}

function CheckIcon({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="text-emerald-400" aria-hidden>
        ✓
      </span>
    );
  }
  return (
    <span className="text-rose-400" aria-hidden>
      ✗
    </span>
  );
}

export function RunReview({ run }: RunReviewProps) {
  const verdict = run.verdictJson as {
    status?: string;
    reason?: string;
    confidence?: number;
  } | null;

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary"
          >
            ← Runs
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                #{run.prNumber} {run.prTitle}
              </h1>
              <RunStatusPill status={run.status} />
            </div>
            <p className="mt-2 font-mono text-sm text-text-secondary">
              {run.repository.owner}/{run.repository.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              {run.headRef ? (
                <span>
                  Branch:{" "}
                  <code className="font-mono text-xs text-text-secondary">
                    {run.headRef}
                  </code>
                </span>
              ) : null}
              <span>
                Commit:{" "}
                <code className="font-mono text-xs text-text-secondary">
                  {run.headSha.slice(0, 7)}
                </code>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={run.githubPrUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-glass-border bg-white/[0.04] px-3 py-1.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-white/[0.08] hover:text-text-primary"
            >
              GitHub PR
            </a>
            <a
              href={run.reportUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-glass-border bg-white/[0.04] px-3 py-1.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-white/[0.08] hover:text-text-primary"
            >
              Report
            </a>
          </div>
        </div>

        {run.tags ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-xs text-text-secondary">
              {run.tags.suiteId}
            </span>
            <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-xs text-text-secondary">
              {run.tags.testCaseId}
            </span>
            {run.calibration ? (
              <CalibrationBadge
                expectedVerdict={run.calibration.expectedVerdict}
                actualVerdict={run.calibration.actualVerdict}
                calibration={run.calibration.result}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <GlassPanel>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-text-muted">
          Verdict
        </h2>
        {run.verdictStatus ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <RunStatusPill status={run.verdictStatus} />
              {run.confidence != null ? (
                <span className="text-sm text-text-secondary">
                  {run.confidence}% confidence
                </span>
              ) : null}
            </div>
            {(run.clientSummary ?? verdict?.reason) ? (
              <p className="text-sm leading-relaxed text-text-secondary">
                {run.clientSummary ?? verdict?.reason}
              </p>
            ) : null}
            {run.checklist && run.checklist.length > 0 ? (
              <ul className="space-y-2 border-t border-glass-border/50 pt-4">
                {run.checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <CheckIcon ok={item.ok} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No verdict yet.</p>
        )}
        {run.errorMessage ? (
          <p className="mt-4 text-sm text-rose-400">{run.errorMessage}</p>
        ) : null}
      </GlassPanel>

      {run.videoUrl ? (
        <GlassPanel padding="sm">
          <h2 className="mb-4 px-2 text-sm font-medium uppercase tracking-wide text-text-muted">
            Session recording
          </h2>
          <video
            src={run.videoUrl}
            controls
            className="w-full rounded-lg bg-black"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        </GlassPanel>
      ) : null}

      {run.screenshots.length > 0 ? (
        <GlassPanel>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-text-muted">
            Screenshots
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {run.screenshots.map((shot) => (
              <a
                key={shot.key}
                href={shot.url}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-lg border border-glass-border bg-black/40"
              >
                <img
                  src={shot.url}
                  alt={shot.label ?? shot.key}
                  className="aspect-video w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
                />
                {shot.label ? (
                  <p className="truncate px-2 py-1.5 text-xs text-text-muted">
                    {shot.label}
                  </p>
                ) : null}
              </a>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      <GlassPanel>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-text-muted">
          Steps
        </h2>
        {run.steps.length === 0 ? (
          <p className="text-sm text-text-secondary">No steps recorded.</p>
        ) : (
          <ol className="relative space-y-0">
            {run.steps.map((step, index) => (
              <li
                key={step.id}
                className="relative flex gap-4 border-l border-glass-border pb-6 pl-6 last:border-transparent last:pb-0"
              >
                <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-glass-border bg-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">
                      {index + 1}
                    </span>
                    <strong className="text-text-primary">{step.name}</strong>
                    <RunStatusPill status={step.status} />
                  </div>
                  {step.expected ? (
                    <p className="mt-1 text-xs text-text-muted">
                      Expected: {step.expected}
                    </p>
                  ) : null}
                  {step.observed ? (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Observed: {step.observed}
                    </p>
                  ) : null}
                  {step.errorMessage ? (
                    <p className="mt-1 text-xs text-rose-400">
                      {step.errorMessage}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </GlassPanel>
    </div>
  );
}
