import { Webhooks } from "@octokit/webhooks";

import { env } from "../config.js";
import { enqueueQaRun } from "../queue/index.js";
import { getInstallationOctokit } from "./app.js";
import {
  createQaRun,
  ensureRepository,
  postQueuedComment,
  storeDeploymentUrl,
} from "./runs.js";
import { isQaLabel, mapTrigger, parseQaComment } from "./triggers.js";
import { getWebhookInstallation } from "./webhook-utils.js";

export function createGithubWebhooks(): Webhooks {
  const webhooks = new Webhooks({
    secret: env.githubWebhookSecret || "dev-webhook-secret",
  });

  webhooks.on("pull_request.opened", async ({ payload }) => {
    if (!payload.installation) return;

    const installation = getWebhookInstallation(
      payload.installation,
      payload.repository,
    );

    const repo = await ensureRepository({
      installationId: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    });

    const run = await createQaRun({
      repositoryId: repo.id,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      trigger: mapTrigger("pr_opened"),
    });

    await postQueuedComment(run.id);
    enqueueQaRun(run.id);
  });

  webhooks.on("pull_request.synchronize", async ({ payload }) => {
    if (!payload.installation) return;

    const installation = getWebhookInstallation(
      payload.installation,
      payload.repository,
    );

    const repo = await ensureRepository({
      installationId: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    });

    const run = await createQaRun({
      repositoryId: repo.id,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      trigger: mapTrigger("pr_updated"),
    });

    await postQueuedComment(run.id);
    enqueueQaRun(run.id);
  });

  webhooks.on("pull_request.labeled", async ({ payload }) => {
    if (!payload.installation) return;
    if (!payload.label || !isQaLabel(payload.label.name)) return;

    const installation = getWebhookInstallation(
      payload.installation,
      payload.repository,
    );

    const repo = await ensureRepository({
      installationId: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    });

    const run = await createQaRun({
      repositoryId: repo.id,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      trigger: mapTrigger("label"),
    });

    await postQueuedComment(run.id);
    enqueueQaRun(run.id);
  });

  webhooks.on("issue_comment.created", async ({ payload }) => {
    if (!payload.installation) return;
    if (!payload.issue.pull_request) return;

    const parsed = parseQaComment(payload.comment.body ?? "");
    if (!parsed) return;

    const installation = getWebhookInstallation(
      payload.installation,
      payload.repository,
    );

    const repo = await ensureRepository({
      installationId: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    });

    const octokit = await getInstallationOctokit(installation.id);
    const pr = await octokit.rest.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.issue.number,
    });

    const run = await createQaRun({
      repositoryId: repo.id,
      prNumber: payload.issue.number,
      prTitle: pr.data.title,
      headSha: pr.data.head.sha,
      trigger: parsed.command === "retry" ? "retry" : "comment",
      previewUrl: parsed.previewUrl,
    });

    await postQueuedComment(run.id);
    enqueueQaRun(run.id);
  });

  webhooks.on("deployment_status", async ({ payload }) => {
    if (!payload.deployment.payload) return;

    const prNumber = Number(
      (payload.deployment.payload as { pr?: number }).pr ??
        (payload.deployment.payload as { pull_request?: { number?: number } })
          .pull_request?.number,
    );

    if (!prNumber || Number.isNaN(prNumber)) return;

    const environmentUrl =
      payload.deployment_status.environment_url ??
      payload.deployment_status.target_url;

    if (!environmentUrl) return;

    await storeDeploymentUrl({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber,
      headSha: payload.deployment.sha,
      url: environmentUrl,
      provider: payload.deployment.environment,
    });
  });

  return webhooks;
}
