import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@accelute/db";
import type { QaPlan, QaStep, StepResult } from "@accelute/shared";

import { getBrowserBackend } from "../browser/index.js";
import type { BrowserSession } from "../browser/types.js";
import { shouldCaptureScreenshot } from "../evidence/capture.js";
import { env, isFireworksConfigured } from "../config.js";
import { EvidenceStore } from "../evidence/r2.js";
import { createFireworksModel } from "../llm/fireworks.js";
import { transcodeWebmToMp4 } from "../video/process.js";

async function pickTargetWithAi(
  session: BrowserSession,
  step: QaStep,
): Promise<boolean> {
  if (!isFireworksConfigured() || !step.target?.text) {
    return false;
  }

  const snapshot = await session.snapshot();
  const model = createFireworksModel(0);
  const response = await model.invoke(
    `Given this HTML snapshot, can the element described as "${step.description}" with text "${step.target.text}" likely be interacted with? Reply only YES or NO.\n\n${snapshot.slice(0, 6000)}`,
  );

  const answer =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return answer.toUpperCase().includes("YES");
}

async function captureScreenshot(params: {
  session: BrowserSession;
  evidenceStore: EvidenceStore;
  stepDbId: string;
  step: QaStep;
  suffix: string;
  failed: boolean;
}): Promise<StepResult["evidence"][number] | null> {
  if (!shouldCaptureScreenshot(params.step, params.failed)) {
    return null;
  }

  const shot = await params.session.screenshot(`${params.step.id}-${params.suffix}`);
  return params.evidenceStore.upload({
    filename: `${params.step.id}-${params.suffix}.png`,
    body: shot.buffer,
    contentType: "image/png",
    type: "screenshot",
    stepId: params.stepDbId,
    label: shot.label,
  });
}

async function executeStep(params: {
  session: BrowserSession;
  step: QaStep;
  previewUrl: string;
  evidenceStore: EvidenceStore;
  stepDbId: string;
}): Promise<StepResult> {
  const { session, step, previewUrl, evidenceStore, stepDbId } = params;
  const evidence: StepResult["evidence"] = [];
  let usedAiFallback = false;

  try {
    switch (step.action) {
      case "navigate": {
        const url =
          step.value && /^https?:\/\//i.test(step.value)
            ? step.value
            : previewUrl;
        await session.goto(url);
        const shot = await captureScreenshot({
          session,
          evidenceStore,
          stepDbId,
          step,
          suffix: "loaded",
          failed: false,
        });
        if (shot) {
          evidence.push(shot);
        }
        break;
      }
      case "click": {
        if (!step.target) throw new Error("Click step requires a target");

        try {
          await session.click(step.target);
        } catch (error) {
          const before = await captureScreenshot({
            session,
            evidenceStore,
            stepDbId,
            step,
            suffix: "before",
            failed: true,
          });
          if (before) evidence.push(before);

          usedAiFallback = await pickTargetWithAi(session, step);
          if (!usedAiFallback) throw error;
        }

        const after = await captureScreenshot({
          session,
          evidenceStore,
          stepDbId,
          step,
          suffix: "after",
          failed: false,
        });
        if (after) evidence.push(after);
        break;
      }
      case "type": {
        if (!step.target || !step.value) {
          throw new Error("Type step requires target and value");
        }
        await session.type(step.target, step.value);
        break;
      }
      case "select": {
        if (!step.target || !step.value) {
          throw new Error("Select step requires target and value");
        }
        await session.selectOption(step.target, step.value);
        break;
      }
      case "assert_visible": {
        if (!step.target) throw new Error("assert_visible requires a target");
        const visible = await session.assertVisible(step.target);

        if (!visible) {
          const shot = await captureScreenshot({
            session,
            evidenceStore,
            stepDbId,
            step,
            suffix: "assert",
            failed: true,
          });
          if (shot) evidence.push(shot);

          return {
            stepId: step.id,
            description: step.description,
            status: "failed",
            action: step.action,
            expected: step.assertion?.expected ?? "Element should be visible",
            observed: "Element was not visible",
            usedAiFallback,
            evidence,
          };
        }

        const shot = await captureScreenshot({
          session,
          evidenceStore,
          stepDbId,
          step,
          suffix: "assert",
          failed: false,
        });
        if (shot) evidence.push(shot);
        break;
      }
      case "assert_text": {
        if (!step.target || !step.assertion?.expected) {
          throw new Error("assert_text requires target and expected text");
        }
        const ok = await session.assertText(step.target, step.assertion.expected);
        if (!ok) {
          const text = await session.readVisibleText();
          return {
            stepId: step.id,
            description: step.description,
            status: "failed",
            action: step.action,
            expected: step.assertion.expected,
            observed: text.slice(0, 500),
            usedAiFallback,
            evidence,
          };
        }
        break;
      }
      case "wait": {
        await session.wait(Number(step.value ?? 1000));
        break;
      }
      case "scroll": {
        await session.scroll();
        break;
      }
      case "check_console": {
        const errors = session.getConsoleErrors();
        if (errors.length > 0) {
          const log = JSON.stringify(errors, null, 2);
          evidence.push(
            await evidenceStore.upload({
              filename: `${step.id}-console.json`,
              body: log,
              contentType: "application/json",
              type: "console",
              stepId: stepDbId,
              label: "Console errors",
            }),
          );

          return {
            stepId: step.id,
            description: step.description,
            status: "failed",
            action: step.action,
            expected: "No console errors",
            observed: errors.map((e) => e.text).join("; ").slice(0, 500),
            evidence,
          };
        }
        break;
      }
      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }

    await prisma.qaStep.update({
      where: { id: stepDbId },
      data: {
        status: "passed",
        expected: step.assertion?.expected,
        observed: "Step completed successfully",
      },
    });

    return {
      stepId: step.id,
      description: step.description,
      status: "passed",
      action: step.action,
      expected: step.assertion?.expected,
      observed: "Step completed successfully",
      usedAiFallback,
      evidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const failureShot = await captureScreenshot({
      session,
      evidenceStore,
      stepDbId,
      step,
      suffix: "error",
      failed: true,
    }).catch(() => null);
    if (failureShot) {
      evidence.push(failureShot);
    }

    await prisma.qaStep.update({
      where: { id: stepDbId },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    return {
      stepId: step.id,
      description: step.description,
      status: "failed",
      action: step.action,
      expected: step.assertion?.expected,
      observed: message,
      errorMessage: message,
      usedAiFallback,
      evidence,
    };
  }
}

export async function executeQaPlan(params: {
  runId: string;
  prNumber: number;
  previewUrl: string;
  plan: QaPlan;
}): Promise<{
  stepResults: StepResult[];
  sessionEvidence: StepResult["evidence"];
}> {
  const artifactsDir = join(env.evidenceTmpDir, params.runId);
  await mkdir(artifactsDir, { recursive: true });

  const evidenceStore = new EvidenceStore(params.runId, params.prNumber);
  const backend = getBrowserBackend();
  const session = await backend.createSession(params.previewUrl, artifactsDir);

  const stepResults: StepResult[] = [];

  try {
    for (const [index, step] of params.plan.test_steps.entries()) {
      const dbStep = await prisma.qaStep.create({
        data: {
          runId: params.runId,
          stepIndex: index,
          name: step.description,
          action: step.action,
          status: "running",
          expected: step.assertion?.expected,
        },
      });

      const result = await executeStep({
        session,
        step,
        previewUrl: params.previewUrl,
        evidenceStore,
        stepDbId: dbStep.id,
      });

      stepResults.push(result);
    }

    const domSnapshot = await session.snapshot();
    const consoleErrors = session.getConsoleErrors();
    const networkErrors = session.getNetworkErrors();

    const sessionEvidence: StepResult["evidence"] = [];

    sessionEvidence.push(
      await evidenceStore.upload({
        filename: "dom-snapshot.html",
        body: domSnapshot,
        contentType: "text/html",
        type: "dom",
        label: "DOM snapshot",
      }),
    );

    sessionEvidence.push(
      await evidenceStore.upload({
        filename: "console-log.json",
        body: JSON.stringify(consoleErrors, null, 2),
        contentType: "application/json",
        type: "console",
        label: "Console log",
      }),
    );

    sessionEvidence.push(
      await evidenceStore.upload({
        filename: "network-errors.json",
        body: JSON.stringify(networkErrors, null, 2),
        contentType: "application/json",
        type: "network",
        label: "Network errors",
      }),
    );

    const trace = await session.stopTrace();
    if (trace) {
      sessionEvidence.push(
        await evidenceStore.upload({
          filename: "trace.zip",
          body: trace,
          contentType: "application/zip",
          type: "trace",
          label: "Playwright trace",
        }),
      );
    }

    const video = await session.stopVideo();
    if (video) {
      try {
        const mp4 = await transcodeWebmToMp4(video);
        sessionEvidence.push(
          await evidenceStore.upload({
            filename: "session.mp4",
            body: mp4,
            contentType: "video/mp4",
            type: "video",
            label: "Demo video (2x)",
            public: true,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sessionEvidence.push(
          await evidenceStore.upload({
            filename: "session.webm",
            body: video,
            contentType: "video/webm",
            type: "video",
            label: `Browser session video (transcode failed: ${message})`,
          }),
        );
      }
    }

    await writeFile(
      join(artifactsDir, "step-results.json"),
      JSON.stringify(stepResults, null, 2),
    );

    return { stepResults, sessionEvidence };
  } finally {
    await session.close();
  }
}
