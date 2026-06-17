import { prisma } from "@accelute/db";
import type { QaPlan, StepResult, Verdict } from "@accelute/shared";

import { env } from "../config.js";
import { executeQaPlan } from "../executor/run.js";
import { EvidenceStore } from "../evidence/r2.js";
import { getInstallationOctokit } from "../github/app.js";
import { upsertQaComment } from "../github/comments.js";
import { judgeQaRun } from "../judge/judge.js";
import { loadPrContextForRun, resolvePreviewUrl } from "../preview/resolve.js";
import {
  renderBlockedReport,
  renderErrorReport,
  renderQaReport,
} from "../report/render.js";
import { generateQaPlan } from "../understanding/plan.js";

async function updateRunStatus(
  runId: string,
  status: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await prisma.qaRun.update({
    where: { id: runId },
    data: { status, ...extra },
  });
}

async function postReportComment(
  runId: string,
  body: string,
): Promise<void> {
  if (!env.githubAppId || !env.githubAppPrivateKey) {
    return;
  }

  const run = await prisma.qaRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      repository: { include: { installation: true } },
    },
  });

  const octokit = await getInstallationOctokit(
    run.repository.installation.githubInstallationId,
  );

  const commentId = await upsertQaComment({
    octokit,
    owner: run.repository.owner,
    repo: run.repository.name,
    issueNumber: run.prNumber,
    existingCommentId: run.reportCommentId,
    body,
  });

  await prisma.qaRun.update({
    where: { id: runId },
    data: { reportCommentId: commentId },
  });
}

export async function runQaPipeline(runId: string): Promise<void> {
  try {
    const run = await prisma.qaRun.findUniqueOrThrow({
      where: { id: runId },
      include: { repository: true },
    });

    await updateRunStatus(runId, "understanding");
    const context = await loadPrContextForRun(runId);
    const plan = await generateQaPlan(context);

    await prisma.qaRun.update({
      where: { id: runId },
      data: { planJson: plan },
    });

    await updateRunStatus(runId, "resolving_preview");
    const previewUrl = await resolvePreviewUrl(runId);

    if (!previewUrl) {
      await updateRunStatus(runId, "blocked");
      await postReportComment(
        runId,
        renderBlockedReport(
          "QA Agent could not run because no preview deployment URL was found.",
        ),
      );
      return;
    }

    await updateRunStatus(runId, "running");
    const { stepResults, sessionEvidence } = await executeQaPlan({
      runId,
      prNumber: run.prNumber,
      previewUrl,
      plan,
    });

    await updateRunStatus(runId, "judging");

    const consoleEvidence = sessionEvidence.find((e) => e.type === "console");
    const networkEvidence = sessionEvidence.find((e) => e.type === "network");

    const verdict: Verdict = await judgeQaRun({
      plan,
      stepResults,
      previewUrl,
      consoleErrors: consoleEvidence ? [consoleEvidence.key] : [],
      networkErrors: networkEvidence ? [networkEvidence.key] : [],
    });

    const evidenceStore = new EvidenceStore(runId, run.prNumber);
    const allEvidence = await evidenceStore.listForRun();

    const reportJson = {
      plan,
      stepResults,
      verdict,
      previewUrl,
    };

    await evidenceStore.upload({
      filename: "qa-report.json",
      body: JSON.stringify(reportJson, null, 2),
      contentType: "application/json",
      type: "report",
      label: "QA report JSON",
    });

    const refreshedEvidence = await evidenceStore.listForRun();

    const reportBody = renderQaReport({
      prTitle: run.prTitle,
      plan,
      verdict,
      stepResults,
      evidence: refreshedEvidence,
    });

    await prisma.qaRun.update({
      where: { id: runId },
      data: {
        verdictJson: verdict,
        confidence: verdict.confidence,
        status: "reported",
      },
    });

    await postReportComment(runId, reportBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.qaRun.update({
      where: { id: runId },
      data: {
        status: "error",
        errorMessage: message,
      },
    });

    await postReportComment(runId, renderErrorReport(message));
  }
}
