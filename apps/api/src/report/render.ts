import type { QaPlan, StepResult, Verdict } from "@accelute/shared";

import type { CommentAttachment } from "../github/assets.js";

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

function renderAttachments(attachments: CommentAttachment[]): string {
  if (attachments.length === 0) {
    return "";
  }

  return `${attachments.map((item) => item.markdown).join("\n\n")}\n\n`;
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
  attachments: CommentAttachment[];
  clientSummary: string;
  reportUrl: string;
}): string {
  const { plan, verdict, attachments, clientSummary, reportUrl } = params;
  const statusLine = STATUS_EMOJI[verdict.status];

  const issueSection =
    verdict.status === "failed"
      ? `### Issue\n${verdict.reason}\n\n`
      : verdict.status === "inconclusive"
        ? `### Note\n${verdict.reason}\n\n`
        : "";

  const footer =
    verdict.status === "failed" && verdict.suggestedNextStep
      ? `${verdict.suggestedNextStep}\n\n`
      : "";

  return `## QA Agent · ${statusLine}

${clientSummary}

**Goal:** ${plan.goal}

${issueSection}### What we checked
${renderChecklist(verdict)}

${renderAttachments(attachments)}**Confidence:** ${verdict.confidence}% · [Full report](${reportUrl})

${footer}`.trimEnd();
}

export function renderErrorReport(error: string): string {
  return `## QA Agent Result: ❌ Error

The QA run encountered an unexpected error.

\`\`\`
${error}
\`\`\`

Please retry with \`/qa retry\`.`;
}
