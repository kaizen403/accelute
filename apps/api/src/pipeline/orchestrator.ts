import { rm } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@accelute/db";
import type { Verdict } from "@accelute/shared";

import { env } from "../config.js";
import { curateEvidenceForComment } from "../evidence/curate.js";
import { pickPosterScreenshotKey } from "../evidence/poster.js";
import { executeQaPlan } from "../executor/run.js";
import { EvidenceStore } from "../evidence/r2.js";
import { getInstallationOctokit } from "../github/app.js";
import { buildCommentAttachments, buildReportUrl } from "../github/assets.js";
import { upsertQaComment } from "../github/comments.js";
import { judgeQaRun } from "../judge/judge.js";
import {
  loadPrContextForRun,
  resolvePreviewUrl,
} from "../preview/resolve.js";
import { clonePrHead, removeCloneDir } from "../repo/clone.js";
import { QaBlockedError, isBlockedError } from "../repo/errors.js";
import { startApp, type AppRunner } from "../repo/runner.js";
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

async function resolvePreviewUrlForRun(
  runId: string,
): Promise<{ previewUrl: string; appRunner: AppRunner | null }> {
  const run = await prisma.qaRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      repository: { include: { installation: true } },
    },
  });

  if (run.previewUrl) {
    return { previewUrl: run.previewUrl, appRunner: null };
  }

  await updateRunStatus(runId, "resolving_preview");
  const deployedUrl = await resolvePreviewUrl(runId);
  if (deployedUrl) {
    return { previewUrl: deployedUrl, appRunner: null };
  }

  if (!env.cloneAndRunEnabled) {
    throw new QaBlockedError(
      "No preview deployment URL was found and clone-and-run is disabled. Set CLONE_AND_RUN_ENABLED=true or use `/qa url=<preview>`.",
    );
  }

  const context = await loadPrContextForRun(runId);

  if (
    !context.headRepoFullName ||
    !context.headRef ||
    !context.headSha
  ) {
    throw new Error("PR head metadata is missing; cannot clone repository.");
  }

  const baseRepoFullName = `${run.repository.owner}/${run.repository.name}`;
  if (
    context.headRepoFullName !== baseRepoFullName &&
    !env.allowForkClones
  ) {
    throw new QaBlockedError(
      `Fork PR clone is disabled for ${context.headRepoFullName}. Install the app on the fork, set ALLOW_FORK_CLONES=true, or use \`/qa url=<preview>\`.`,
    );
  }

  await updateRunStatus(runId, "cloning");
  const cloneDir = await clonePrHead({
    runId,
    installationId: run.repository.installation.githubInstallationId,
    headRepoFullName: context.headRepoFullName,
    headRef: context.headRef,
    headSha: context.headSha,
  });

  await updateRunStatus(runId, "starting_app");
  const appRunner = await startApp(cloneDir);
  const previewUrl = appRunner.url;

  await prisma.qaRun.update({
    where: { id: runId },
    data: { previewUrl, headSha: context.headSha },
  });

  return { previewUrl, appRunner };
}

export async function runQaPipeline(runId: string): Promise<void> {
  let appRunner: AppRunner | null = null;

  try {
    const run = await prisma.qaRun.findUniqueOrThrow({
      where: { id: runId },
      include: { repository: { include: { installation: true } } },
    });

    try {
      const resolved = await resolvePreviewUrlForRun(runId);
      appRunner = resolved.appRunner;
      const previewUrl = resolved.previewUrl;

      await updateRunStatus(runId, "understanding");
      const context = await loadPrContextForRun(runId);
      const plan = await generateQaPlan({
        ...context,
        previewUrlOverride: previewUrl,
        deploymentUrl: previewUrl,
      });

      await prisma.qaRun.update({
        where: { id: runId },
        data: { planJson: plan },
      });

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
      const refreshedEvidence = await evidenceStore.listForRun();

      const curation = await curateEvidenceForComment({
        plan,
        stepResults,
        verdict,
        evidence: refreshedEvidence,
      });

      const reportJson = {
        plan,
        stepResults,
        verdict,
        previewUrl,
        curation,
      };

      await evidenceStore.upload({
        filename: "qa-report.json",
        body: JSON.stringify(reportJson, null, 2),
        contentType: "application/json",
        type: "report",
        label: "QA report JSON",
      });

      const reportUrl = buildReportUrl(runId);
      const posterScreenshotKey = pickPosterScreenshotKey({
        evidence: refreshedEvidence,
        stepResults,
        highlightStepId: curation.highlightStepId,
        commentScreenshotKeys: curation.commentScreenshotKeys,
      });
      const reportOctokit = await getInstallationOctokit(
        run.repository.installation.githubInstallationId,
      );
      const attachments = await buildCommentAttachments({
        octokit: reportOctokit,
        owner: run.repository.owner,
        repo: run.repository.name,
        prNumber: run.prNumber,
        runId,
        reportUrl,
        evidence: refreshedEvidence,
        evidenceStore,
        selectedScreenshotKeys: curation.commentScreenshotKeys,
        posterScreenshotKey: posterScreenshotKey ?? undefined,
        showSessionPreview: curation.showSessionPreview,
      });

      const reportBody = renderQaReport({
        prTitle: run.prTitle,
        plan,
        verdict,
        attachments,
        clientSummary: curation.clientSummary,
        reportUrl,
      });

      await prisma.qaRun.update({
        where: { id: runId },
        data: {
          verdictJson: verdict,
          confidence: verdict.confidence,
          status: "reported",
          errorMessage: null,
        },
      });

      await postReportComment(runId, reportBody);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isBlockedError(error)) {
        await updateRunStatus(runId, "blocked", { errorMessage: message });
        await postReportComment(runId, renderBlockedReport(message));
        return;
      }

      throw error;
    }
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
  } finally {
    if (appRunner) {
      await appRunner.stop().catch(() => undefined);
    }

    await removeCloneDir(runId).catch(() => undefined);
    await rm(join(env.evidenceTmpDir, runId), {
      recursive: true,
      force: true,
    }).catch(() => undefined);
  }
}
