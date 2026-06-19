import { prisma } from "@accelute/db";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { enqueueQaRun } from "../queue/index.js";
import { createQaRun, ensureRepository } from "../github/runs.js";

export const devRouter: Router = createRouter();

devRouter.post("/trigger", async (req: Request, res: Response) => {
  const {
    owner = "demo",
    repo = "demo",
    prNumber = 1,
    prTitle = "Demo PR",
    headSha = "abc123",
    headRef,
    previewUrl,
  } = req.body as {
    owner?: string;
    repo?: string;
    prNumber?: number;
    prTitle?: string;
    headSha?: string;
    headRef?: string;
    previewUrl?: string;
  };

  const installation = await prisma.installation.upsert({
    where: { githubInstallationId: 0 },
    create: {
      githubInstallationId: 0,
      accountLogin: owner,
      accountType: "User",
    },
    update: {},
  });

  const repository = await prisma.repository.upsert({
    where: { owner_name: { owner, name: repo } },
    create: {
      installationId: installation.id,
      owner,
      name: repo,
    },
    update: { installationId: installation.id },
  });

  const run = await createQaRun({
    repositoryId: repository.id,
    prNumber,
    prTitle,
    headSha,
    headRef,
    trigger: "manual",
    previewUrl,
  });

  enqueueQaRun(run.id);

  res.status(202).json({ runId: run.id });
});
