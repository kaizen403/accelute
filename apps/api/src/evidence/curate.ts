import type {
  EvidenceCuration,
  EvidenceRef,
  QaPlan,
  StepResult,
  Verdict,
} from "@accelute/shared";
import { EvidenceCurationSchema } from "@accelute/shared";

import { isFireworksConfigured } from "../config.js";
import { createFireworksModel } from "../llm/fireworks.js";

function collectScreenshotKeys(stepResults: StepResult[]): string[] {
  const keys: string[] = [];

  for (const step of stepResults) {
    for (const item of step.evidence) {
      if (item.type === "screenshot" && item.key) {
        keys.push(item.key);
      }
    }
  }

  return keys;
}

function buildFallbackCuration(params: {
  plan: QaPlan;
  stepResults: StepResult[];
  verdict: Verdict;
}): EvidenceCuration {
  const failedSteps = params.stepResults.filter((step) => step.status === "failed");
  const keys: string[] = [];

  for (const step of failedSteps) {
    for (const item of step.evidence) {
      if (item.type === "screenshot") {
        keys.push(item.key);
      }
    }
  }

  if (keys.length === 0) {
    const navigateStep = params.stepResults.find((step) => step.action === "navigate");
    const firstShot = navigateStep?.evidence.find((item) => item.type === "screenshot");
    if (firstShot) {
      keys.push(firstShot.key);
    }
  }

  if (keys.length === 0) {
    const anyShot = collectScreenshotKeys(params.stepResults)[0];
    if (anyShot) {
      keys.push(anyShot);
    }
  }

  return {
    clientSummary:
      params.verdict.status === "passed"
        ? params.plan.goal
        : params.verdict.reason,
    highlightStepId: failedSteps[0]?.stepId,
    commentScreenshotKeys: keys.slice(0, 2),
    showSessionPreview: true,
  };
}

export async function curateEvidenceForComment(params: {
  plan: QaPlan;
  stepResults: StepResult[];
  verdict: Verdict;
  evidence: EvidenceRef[];
}): Promise<EvidenceCuration> {
  const screenshots = params.evidence
    .filter((item) => item.type === "screenshot")
    .map((item) => ({
      key: item.key,
      label: item.label ?? item.key.split("/").pop() ?? "screenshot",
    }));

  if (!isFireworksConfigured() || screenshots.length === 0) {
    return buildFallbackCuration(params);
  }

  const model = createFireworksModel(0.1);
  const structured = model.withStructuredOutput(EvidenceCurationSchema);

  const stepSummary = params.stepResults.map((step) => ({
    stepId: step.stepId,
    description: step.description,
    status: step.status,
    action: step.action,
    errorMessage: step.errorMessage,
    screenshotKeys: step.evidence
      .filter((item) => item.type === "screenshot")
      .map((item) => item.key),
  }));

  const prompt = `You curate QA evidence for a pull-request comment shown to the client.

Pick only what helps someone understand the result quickly:
- showSessionPreview: true (test screenshot with play button links to full report video)
- commentScreenshotKeys: 0-2 screenshot keys from the available list (never more than 2; the best one is also used as the video poster)
- clientSummary: 1-2 plain-English sentences for the client (what was tested, what happened)
- highlightStepId: the most important step id if something failed or is worth highlighting

Rules:
- On failure: include the screenshot that best shows the failure (prefer failed step screenshots).
- On pass: include 0-1 screenshots only if they prove the PR's user-facing change; skip generic loading screens.
- Do not include diagnostic-only screenshots unless they are essential.
- Prefer screenshots tied to critical steps over supporting/diagnostic steps.

Goal: ${params.plan.goal}
Expected: ${params.plan.expected_result}
Verdict: ${params.verdict.status} — ${params.verdict.reason}

Steps:
${JSON.stringify(stepSummary, null, 2)}

Available screenshots (key + label):
${JSON.stringify(screenshots, null, 2)}
`;

  try {
    const curation = await structured.invoke(prompt);
    const parsed = EvidenceCurationSchema.parse(curation);

    const validKeys = new Set(screenshots.map((item) => item.key));
    return {
      ...parsed,
      commentScreenshotKeys: parsed.commentScreenshotKeys.filter((key) =>
        validKeys.has(key),
      ),
    };
  } catch {
    return buildFallbackCuration(params);
  }
}
