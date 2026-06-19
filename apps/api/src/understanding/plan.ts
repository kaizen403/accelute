import type { PrContext, QaPlan } from "@accelute/shared";
import { QaPlanSchema } from "@accelute/shared";

import { isFireworksConfigured } from "../config.js";
import { createFireworksModel } from "../llm/fireworks.js";

function buildFallbackPlan(context: PrContext): QaPlan {
  const steps = [
    {
      id: "step-1",
      description: "Open the preview deployment URL",
      action: "navigate" as const,
      value: context.previewUrlOverride ?? context.deploymentUrl,
      capture: "always" as const,
      priority: "critical" as const,
    },
    {
      id: "step-2",
      description: "Verify the page loads without obvious errors",
      action: "assert_visible" as const,
      target: { role: "main" },
      assertion: { type: "visible" as const },
      capture: "on_failure" as const,
      priority: "supporting" as const,
    },
    {
      id: "step-3",
      description: "Check for console errors",
      action: "check_console" as const,
      assertion: { type: "console_clean" as const },
      capture: "on_failure" as const,
      priority: "diagnostic" as const,
    },
  ];

  return {
    goal: `Verify PR changes: ${context.prTitle}`,
    expected_result:
      "The preview deployment loads and basic smoke checks pass without console errors.",
    test_steps: steps,
  };
}

export async function generateQaPlan(context: PrContext): Promise<QaPlan> {
  if (!isFireworksConfigured()) {
    return buildFallbackPlan(context);
  }

  const model = createFireworksModel(0.1);
  const structured = model.withStructuredOutput(QaPlanSchema);

  const prompt = `You are a senior QA engineer. Convert this pull request into a focused browser QA plan that verifies the PR's actual user-facing change — not generic smoke tests.

Return JSON matching this schema:
- goal: one sentence — what user outcome this PR should deliver
- expected_result: what success looks like for a real user
- test_steps: array of steps with id, description, action, optional target/value/assertion, capture, priority

Allowed actions: navigate, click, type, select, assert_visible, assert_text, wait, check_console, scroll

Step fields:
- priority: critical | supporting | diagnostic
  - critical: directly proves the PR change works
  - supporting: related checks (navigation, secondary UI)
  - diagnostic: console/network checks
- capture: always | on_failure | never
  - always: screenshot on success (use sparingly — first load, final success state)
  - on_failure: screenshot only when step fails (default for assertions and clicks)
  - never: no screenshots (waits, scrolls)

Rules:
- Derive acceptance criteria from the PR title, body, linked issue, and diff — not boilerplate.
- 4-8 steps for typical PRs; up to 10 only for large UI changes.
- Every critical user flow step should be priority "critical".
- Use capture "always" only for: initial page load (navigate) and one final success screenshot if the PR is UI-heavy.
- Use capture "on_failure" for clicks, assertions, and check_console.
- Prefer accessibility targets (role, name, text, label) over CSS selectors.
- End with check_console when the PR touches client-side logic.

Pull request title: ${context.prTitle}
Pull request body:
${context.prBody ?? "(empty)"}

Linked issue:
${context.linkedIssue ? `${context.linkedIssue.title}\n${context.linkedIssue.body ?? ""}` : "(none)"}

Changed files:
${context.changedFiles.join("\n")}

Diff excerpt:
${context.diff?.slice(0, 8000) ?? "(no diff)"}

Preview URL: ${context.previewUrlOverride ?? context.deploymentUrl ?? "(resolved at runtime)"}

Recent PR comments:
${context.comments.map((c) => `${c.author}: ${c.body}`).join("\n").slice(0, 4000)}
`;

  try {
    const plan = await structured.invoke(prompt);
    return QaPlanSchema.parse(plan);
  } catch {
    return buildFallbackPlan(context);
  }
}
