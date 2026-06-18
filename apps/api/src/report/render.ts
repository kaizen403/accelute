import type { EvidenceRef, QaPlan, StepResult, Verdict } from "@accelute/shared";

const STATUS_EMOJI: Record<Verdict["status"], string> = {
  passed: "✅ Passed",
  failed: "❌ Failed",
  inconclusive: "⚠️ Inconclusive",
  blocked: "🚫 Blocked",
};

function renderChecklist(verdict: Verdict): string {
  return verdict.checklist
    .map((item) => `- [${item.ok ? "x" : " "}] ${item.label}`)
    .join("\n");
}

function renderEvidence(links: EvidenceRef[]): string {
  const filtered = links.filter(
    (item) => !(item.type === "video" && item.key.endsWith("session.mp4")),
  );

  if (filtered.length === 0) {
    return "- No evidence uploaded";
  }

  return filtered
    .map((item) => {
      const label = item.label ?? item.type;
      return item.url ? `- ${label}: ${item.url}` : `- ${label}: \`${item.key}\``;
    })
    .join("\n");
}

function renderDemoVideo(evidence: EvidenceRef[]): string {
  const video = evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );

  if (!video?.url) {
    return "";
  }

  return `### Demo (2x)
<video src="${video.url}" controls width="640"></video>

[Download demo video](${video.url})

`;
}

export function renderBlockedReport(reason: string): string {
  return `## QA Agent Result: 🚫 Blocked

### Reason
${reason}

### How to fix
- Provide a preview URL: \`/qa url=https://your-preview-url.com\`
- Or add a \`.accelute.yml\` in the repo root with \`install\` and \`start\` commands
- Or ensure the PR contains a supported JS app (Next.js, Vite, Create React App, or static HTML in a pnpm workspace)

> **Security:** Clone-and-run executes PR code locally without a sandbox. Disable with \`CLONE_AND_RUN_ENABLED=false\` in production if you only trust preview URLs.`;
}

export function renderQaReport(params: {
  prTitle: string;
  plan: QaPlan;
  verdict: Verdict;
  stepResults: StepResult[];
  evidence: EvidenceRef[];
}): string {
  const { prTitle, plan, verdict, evidence } = params;
  const statusLine = STATUS_EMOJI[verdict.status];

  const issueSection =
    verdict.status === "failed"
      ? `### Issue found\n${verdict.reason}\n\n`
      : verdict.status === "inconclusive"
        ? `### Reason\n${verdict.reason}\n\nHuman QA recommended.\n\n`
        : "";

  const finalVerdict =
    verdict.status === "passed"
      ? "The requested acceptance checks passed."
      : verdict.status === "failed"
        ? verdict.suggestedNextStep ??
          "Fix the reported issue and rerun `/qa retry`."
        : verdict.suggestedNextStep ??
          "Review the evidence and rerun `/qa` if needed.";

  return `## QA Agent Result: ${statusLine}

### Tested PR
${prTitle}

### Goal
${plan.goal}

${issueSection}### Checks
${renderChecklist(verdict)}

${renderDemoVideo(evidence)}### Evidence
${renderEvidence(evidence)}

### Confidence
${verdict.confidence}%

### Final verdict
${finalVerdict}`;
}

export function renderErrorReport(error: string): string {
  return `## QA Agent Result: ❌ Error

The QA run encountered an unexpected error.

\`\`\`
${error}
\`\`\`

Please retry with \`/qa retry\`.`;
}
