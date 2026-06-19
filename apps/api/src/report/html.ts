import type { QaPlan, Verdict } from "@accelute/shared";
import type { EvidenceRef } from "@accelute/shared";

export type ReportStep = {
  description: string;
  status: string;
  action: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusLabel(status: Verdict["status"]): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "inconclusive":
      return "Inconclusive";
    case "blocked":
      return "Blocked";
  }
}

export function renderReportHtml(params: {
  runId: string;
  prTitle: string;
  prNumber: number;
  owner: string;
  repo: string;
  plan: QaPlan;
  verdict: Verdict;
  videoUrl?: string;
  screenshots: EvidenceRef[];
  steps: ReportStep[];
  clientSummary?: string;
}): string {
  const { plan, verdict, screenshots, videoUrl, steps, clientSummary } = params;

  const checklist = verdict.checklist
    .map(
      (item) =>
        `<li class="${item.ok ? "ok" : "fail"}">${escapeHtml(item.label)}</li>`,
    )
    .join("");

  const timeline = steps
    .map(
      (step) =>
        `<li class="${step.status === "passed" ? "ok" : step.status === "failed" ? "fail" : ""}"><strong>${escapeHtml(step.action)}</strong> — ${escapeHtml(step.description)}</li>`,
    )
    .join("");

  const screenshotHtml = screenshots
    .filter((item) => item.url)
    .map(
      (item) => `
        <figure>
          <img src="${escapeHtml(item.url!)}" alt="${escapeHtml(item.label ?? "screenshot")}" loading="lazy" />
          <figcaption>${escapeHtml(item.label ?? "screenshot")}</figcaption>
        </figure>`,
    )
    .join("");

  const videoHtml = videoUrl
    ? `<video src="${escapeHtml(videoUrl)}" controls playsinline width="960"></video>`
    : `<p class="muted">Session video is not available.</p>`;

  const summaryHtml = clientSummary
    ? `<p class="summary">${escapeHtml(clientSummary)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA report — ${escapeHtml(params.prTitle)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    main { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .meta { color: #8b949e; margin-bottom: 1rem; }
    .summary { font-size: 1.05rem; margin-bottom: 1rem; }
    .status { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; margin-bottom: 1rem; }
    .status.passed { background: #1a3b2a; color: #3fb950; }
    .status.failed { background: #3d1f24; color: #f85149; }
    .status.inconclusive { background: #3d2e1a; color: #d29922; }
    .status.blocked { background: #30363d; color: #8b949e; }
    section { margin-top: 2rem; }
    h2 { font-size: 1.1rem; margin-bottom: 0.75rem; }
    video { width: 100%; border-radius: 8px; background: #000; }
    ul { padding-left: 1.2rem; }
    li.ok { color: #3fb950; }
    li.fail { color: #f85149; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    figure { margin: 0; }
    img { width: 100%; border-radius: 8px; border: 1px solid #30363d; }
    figcaption { color: #8b949e; font-size: 0.85rem; margin-top: 0.35rem; }
    .muted { color: #8b949e; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(params.prTitle)}</h1>
    <p class="meta">${escapeHtml(params.owner)}/${escapeHtml(params.repo)} · PR #${params.prNumber}</p>
    <p class="status ${verdict.status}">${statusLabel(verdict.status)} · ${verdict.confidence}% confidence</p>
    ${summaryHtml}
    <section id="session">
      <h2>Session recording</h2>
      ${videoHtml}
    </section>
    <section>
      <h2>Goal</h2>
      <p>${escapeHtml(plan.goal)}</p>
    </section>
    <section>
      <h2>Step timeline</h2>
      <ul>${timeline}</ul>
    </section>
    <section>
      <h2>Checks</h2>
      <ul>${checklist}</ul>
    </section>
    ${screenshotHtml ? `<section><h2>Screenshots</h2><div class="grid">${screenshotHtml}</div></section>` : ""}
    <section>
      <h2>Verdict</h2>
      <p>${escapeHtml(verdict.reason)}</p>
    </section>
  </main>
</body>
</html>`;
}
