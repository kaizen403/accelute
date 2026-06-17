import { prisma } from "@accelute/db";
import type { PrContext } from "@accelute/shared";

import { env } from "../config.js";
import { getInstallationOctokit } from "../github/app.js";
import {
  extractPreviewUrlsFromText,
  fetchCommitStatusPreviewUrl,
  fetchPrContext,
} from "../github/fetch.js";

export async function resolvePreviewUrl(runId: string): Promise<string | null> {
  const run = await prisma.qaRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      repository: { include: { installation: true } },
    },
  });

  if (run.previewUrl) {
    return run.previewUrl;
  }

  if (!env.githubAppId || !env.githubAppPrivateKey) {
    return null;
  }

  const octokit = await getInstallationOctokit(
    run.repository.installation.githubInstallationId,
  );

  const context = await fetchPrContext({
    octokit,
    owner: run.repository.owner,
    repo: run.repository.name,
    prNumber: run.prNumber,
  });

  if (context.previewUrlOverride) {
    await prisma.qaRun.update({
      where: { id: runId },
      data: { previewUrl: context.previewUrlOverride, headSha: context.headSha },
    });
    return context.previewUrlOverride;
  }

  const deployment = await prisma.deploymentUrl.findFirst({
    where: {
      owner: run.repository.owner,
      repo: run.repository.name,
      OR: [{ prNumber: run.prNumber }, { headSha: context.headSha }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (deployment?.url) {
    await prisma.qaRun.update({
      where: { id: runId },
      data: { previewUrl: deployment.url, headSha: context.headSha },
    });
    return deployment.url;
  }

  const commentUrls = extractPreviewUrlsFromText(
    context.comments.map((c) => c.body).join("\n"),
  );
  if (commentUrls[0]) {
    await prisma.qaRun.update({
      where: { id: runId },
      data: { previewUrl: commentUrls[0], headSha: context.headSha },
    });
    return commentUrls[0];
  }

  const statusUrl = await fetchCommitStatusPreviewUrl({
    octokit,
    owner: run.repository.owner,
    repo: run.repository.name,
    sha: context.headSha,
  });

  if (statusUrl) {
    await prisma.qaRun.update({
      where: { id: runId },
      data: { previewUrl: statusUrl, headSha: context.headSha },
    });
    return statusUrl;
  }

  return null;
}

export async function loadPrContextForRun(runId: string): Promise<PrContext> {
  const run = await prisma.qaRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      repository: { include: { installation: true } },
    },
  });

  if (!env.githubAppId || !env.githubAppPrivateKey) {
    return {
      owner: run.repository.owner,
      repo: run.repository.name,
      prNumber: run.prNumber,
      prTitle: run.prTitle,
      prBody: "",
      headSha: run.headSha,
      changedFiles: [],
      comments: [],
      previewUrlOverride: run.previewUrl ?? undefined,
      deploymentUrl: run.previewUrl ?? undefined,
    };
  }

  const octokit = await getInstallationOctokit(
    run.repository.installation.githubInstallationId,
  );

  return fetchPrContext({
    octokit,
    owner: run.repository.owner,
    repo: run.repository.name,
    prNumber: run.prNumber,
    previewUrlOverride: run.previewUrl ?? undefined,
  });
}
