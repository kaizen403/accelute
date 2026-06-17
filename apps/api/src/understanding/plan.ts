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
      value: context.previewUrlOverride ?? context.deploymentUrl ?? "/",
    },
    {
      id: "step-2",
      description: "Verify the page loads without obvious errors",
      action: "assert_visible" as const,
      target: { role: "main" },
      assertion: { type: "visible" as const },
    },
    {
      id: "step-3",
      description: "Check for console errors",
      action: "check_console" as const,
      assertion: { type: "console_clean" as const },
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

  const prompt = `You are a senior QA engineer. Convert this pull request into a compact, executable browser QA plan.

Return JSON matching this schema:
- goal: one sentence summary
- expected_result: what success looks like
- test_steps: array of structured steps with id, description, action, optional target/value/assertion

Allowed actions: navigate, click, type, select, assert_visible, assert_text, wait, check_console, scroll

Prefer accessibility-first targets (role, name, text, label) over CSS selectors.
Keep the plan to 5-12 steps focused on verifying the PR's actual user-facing change.
Include a final check_console step when appropriate.

Pull request title: ${context.prTitle}
Pull request body:
${context.prBody ?? "(empty)"}

Linked issue:
${context.linkedIssue ? `${context.linkedIssue.title}\n${context.linkedIssue.body ?? ""}` : "(none)"}

Changed files:
${context.changedFiles.join("\n")}

Diff excerpt:
${context.diff?.slice(0, 8000) ?? "(no diff)"}

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
