import type { QaPlan, StepResult, Verdict } from "@accelute/shared";
import { VerdictSchema } from "@accelute/shared";

import { isFireworksConfigured } from "../config.js";
import { createFireworksModel } from "../llm/fireworks.js";

function buildFallbackVerdict(
  plan: QaPlan,
  stepResults: StepResult[],
): Verdict {
  const failed = stepResults.filter((step) => step.status === "failed");
  const passed = stepResults.filter((step) => step.status === "passed");

  const checklist = stepResults
    .filter((step) => step.action !== "check_console" || step.status === "failed")
    .map((step) => ({
      label: step.description,
      ok: step.status === "passed",
    }));

  if (failed.length > 0) {
    return {
      status: "failed",
      confidence: 85,
      reason: failed[0]?.errorMessage ?? failed[0]?.observed ?? "A test step failed.",
      checklist,
      suggestedNextStep: "Fix the failing step and rerun `/qa retry`.",
    };
  }

  if (passed.length === 0) {
    return {
      status: "inconclusive",
      confidence: 40,
      reason: "No steps were executed successfully.",
      checklist,
      suggestedNextStep: "Review the QA plan and rerun `/qa`.",
    };
  }

  return {
    status: "passed",
    confidence: 80,
    reason: `The acceptance criteria appear met: ${plan.goal}`,
    checklist,
  };
}

export async function judgeQaRun(params: {
  plan: QaPlan;
  stepResults: StepResult[];
  previewUrl: string;
  domSnippet?: string;
  consoleErrors?: string[];
  networkErrors?: string[];
}): Promise<Verdict> {
  if (!isFireworksConfigured()) {
    return buildFallbackVerdict(params.plan, params.stepResults);
  }

  const model = createFireworksModel(0.1);
  const structured = model.withStructuredOutput(VerdictSchema);

  const prompt = `You are an independent QA judge evaluating whether a pull request's acceptance criteria are actually met.

Do NOT pass just because steps ran without throwing. Judge the user-facing outcome.

Return:
- status: passed | failed | inconclusive | blocked
- confidence: 0-100
- reason: concise explanation a developer can act on (cite the failing behavior, not just step ids)
- checklist: array of { label, ok } aligned to what mattered for this PR (omit trivial diagnostic items unless they failed)
- suggestedNextStep: optional — specific fix guidance on failure

Classify failures when possible:
- product bug (UI/logic wrong)
- environment/preview issue (app didn't start, wrong URL)
- flaky/timing
- plan gap (couldn't test the real change)

Goal: ${params.plan.goal}
Expected result: ${params.plan.expected_result}
Preview URL: ${params.previewUrl}

Step results:
${JSON.stringify(params.stepResults, null, 2)}

Console errors:
${(params.consoleErrors ?? []).join("\n").slice(0, 2000)}

Network errors:
${(params.networkErrors ?? []).join("\n").slice(0, 2000)}

DOM snippet:
${params.domSnippet?.slice(0, 4000) ?? "(none)"}
`;

  try {
    const verdict = await structured.invoke(prompt);
    return VerdictSchema.parse(verdict);
  } catch {
    return buildFallbackVerdict(params.plan, params.stepResults);
  }
}
