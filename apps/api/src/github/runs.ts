import { prisma } from "@accelute/db";
import type { QaTrigger } from "@accelute/shared";

import { env } from "../config.js";
import { getInstallationOctokit } from "./app.js";
import { upsertQaComment } from "./comments.js";

export async function ensureRepository(params: {
  installationId: number;
  accountLogin: string;
  accountType: string;
  owner: string;
  repo: string;
}) {
  const installation = await prisma.installation.upsert({
    where: { githubInstallationId: params.installationId },
    create: {
      githubInstallationId: params.installationId,
      accountLogin: params.accountLogin,
      accountType: params.accountType,
    },
    update: {
      accountLogin: params.accountLogin,
      accountType: params.accountType,
    },
  });

  return prisma.repository.upsert({
    where: {
      owner_name: {
        owner: params.owner,
        name: params.repo,
      },
    },
    create: {
      installationId: installation.id,
      owner: params.owner,
      name: params.repo,
    },
    update: {
      installationId: installation.id,
    },
  });
}

export async function createQaRun(params: {
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  headSha: string;
  headRef?: string;
  trigger: QaTrigger;
  previewUrl?: string;
}) {
  return prisma.qaRun.create({
    data: {
      repositoryId: params.repositoryId,
      prNumber: params.prNumber,
      prTitle: params.prTitle,
      headSha: params.headSha,
      headRef: params.headRef,
      trigger: params.trigger,
      previewUrl: params.previewUrl,
      status: "queued",
    },
    include: {
      repository: {
        include: { installation: true },
      },
    },
  });
}

export async function postQueuedComment(runId: string): Promise<void> {
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
    body: `## QA Agent: Queued

A QA run has been queued for this pull request.

- **Run ID:** \`${run.id}\`
- **Trigger:** ${run.trigger}
- **Commit:** \`${run.headSha.slice(0, 7)}\`

The agent will generate a test plan, open the preview deployment, and post results here.`,
  });

  await prisma.qaRun.update({
    where: { id: runId },
    data: { reportCommentId: commentId },
  });
}

export async function storeDeploymentUrl(params: {
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  url: string;
  provider?: string;
}): Promise<void> {
  await prisma.deploymentUrl.create({
    data: {
      owner: params.owner,
      repo: params.repo,
      prNumber: params.prNumber,
      headSha: params.headSha,
      url: params.url,
      provider: params.provider,
    },
  });
}
