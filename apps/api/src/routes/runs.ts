import { prisma } from "@accelute/db";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { getEvidenceByKey } from "../evidence/r2.js";

export const runsRouter: Router = createRouter();

runsRouter.get("/", async (_req: Request, res: Response) => {
  const runs = await prisma.qaRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      repository: true,
      _count: { select: { steps: true, evidence: true } },
    },
  });

  res.json(runs);
});

runsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const run = await prisma.qaRun.findUnique({
    where: { id },
    include: {
      repository: true,
      steps: { orderBy: { stepIndex: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  res.json(run);
});

export const evidenceRouter: Router = createRouter();

evidenceRouter.get("/*splat", async (req: Request, res: Response) => {
  const key = decodeURIComponent(req.params.splat ?? "");
  const evidence = await getEvidenceByKey(key);

  if (!evidence) {
    res.status(404).json({ error: "Evidence not found or R2 not configured" });
    return;
  }

  if (evidence.contentType) {
    res.setHeader("Content-Type", evidence.contentType);
  }

  res.send(evidence.body);
});
