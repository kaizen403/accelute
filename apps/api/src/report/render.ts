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
  if (links.length === 0) {
    return "- No evidence uploaded";
  }

  return links
    .map((item) => {
      const label = item.label ?? item.type;
      return item.url ? `- ${label}: ${item.url}` : `- ${label}: \`${item.key}\``;
    })
    .join("\n");
}

export function renderBlockedReport(reason: string): string {
  return `## QA Agent Result: 🚫 Blocked

### Reason
${reason}

### How to fix
Provide a preview URL using:

\`/qa url=https://your-preview-url.com\`

Then rerun \`/qa\`.`;
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

### Evidence
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
