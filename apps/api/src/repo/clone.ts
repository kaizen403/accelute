import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { simpleGit } from "simple-git";

import { env } from "../config.js";
import { getInstallationToken } from "../github/app.js";

import { QaBlockedError } from "./errors.js";

export function getCloneDir(runId: string): string {
  return join(env.cloneTmpDir, runId);
}

export async function clonePrHead(params: {
  runId: string;
  installationId: number;
  headRepoFullName: string;
  headRef: string;
  headSha: string;
}): Promise<string> {
  const cloneDir = getCloneDir(params.runId);
  await rm(cloneDir, { recursive: true, force: true });
  await mkdir(env.cloneTmpDir, { recursive: true });

  const token = await getInstallationToken(params.installationId);
  const authUrl = `https://x-access-token:${token}@github.com/${params.headRepoFullName}.git`;

  try {
    const git = simpleGit();
    await git.clone(authUrl, cloneDir, [
      "--depth",
      "1",
      "--branch",
      params.headRef,
    ]);

    const repoGit = simpleGit(cloneDir);

    try {
      await repoGit.checkout(params.headSha);
    } catch {
      await repoGit.fetch(["origin", params.headSha, "--depth", "1"]);
      await repoGit.checkout(params.headSha);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const isAuth =
      detail.includes("403") ||
      detail.includes("404") ||
      detail.includes("Authentication") ||
      detail.includes("not granted");

    if (isAuth) {
      throw new QaBlockedError(
        `Cannot clone fork repository ${params.headRepoFullName}. Install the GitHub App on the fork or use \`/qa url=<preview>\`.`,
      );
    }

    throw new QaBlockedError(`Could not clone repository: ${detail}`);
  }

  return cloneDir;
}

export async function removeCloneDir(runId: string): Promise<void> {
  await rm(getCloneDir(runId), { recursive: true, force: true });
}
