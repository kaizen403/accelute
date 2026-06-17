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

  const checklist = stepResults.map((step) => ({
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
    reason: `All ${passed.length} executed checks passed for: ${plan.goal}`,
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

  const prompt = `You are an independent QA judge. Do not assume success just because steps ran.
Evaluate whether the PR acceptance criteria are actually met.

Return:
- status: passed | failed | inconclusive | blocked
- confidence: 0-100
- reason: concise explanation
- checklist: array of { label, ok }
- suggestedNextStep: optional guidance for developers

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
