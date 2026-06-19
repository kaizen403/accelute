import { prisma } from "@accelute/db";
import { getSuiteById, matchRunToTestCase } from "@accelute/shared";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { getEvidenceByKey } from "../evidence/r2.js";
import { enrichRunDetail, enrichRunSummary } from "./run-enrichment.js";

function toJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}

function parseLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 100;
  return Math.min(parsed, 500);
}

export const runsRouter: Router = createRouter();

runsRouter.get("/", async (req: Request, res: Response) => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const owner =
    typeof req.query.owner === "string" ? req.query.owner : undefined;
  const repo =
    typeof req.query.repo === "string" ? req.query.repo : undefined;
  const suiteId =
    typeof req.query.suite === "string" ? req.query.suite : undefined;
  const testCaseId =
    typeof req.query.testCase === "string" ? req.query.testCase : undefined;
  const limit = parseLimit(req.query.limit);

  const runs = await prisma.qaRun.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(owner || repo
        ? {
            repository: {
              ...(owner ? { owner } : {}),
              ...(repo ? { name: repo } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: suiteId || testCaseId ? 500 : limit,
    include: {
      repository: true,
      _count: { select: { steps: true, evidence: true } },
    },
  });

  let filtered = runs;

  if (suiteId) {
    const suite = getSuiteById(suiteId);
    if (!suite) {
      res.json([]);
      return;
    }

    filtered = filtered.filter((run) => {
      if (
        run.repository.owner !== suite.repository.owner ||
        run.repository.name !== suite.repository.name
      ) {
        return false;
      }

      const match = matchRunToTestCase(
        run.headRef,
        run.repository.owner,
        run.repository.name,
      );
      return match?.suiteId === suiteId;
    });
  }

  if (testCaseId) {
    filtered = filtered.filter((run) => {
      const match = matchRunToTestCase(
        run.headRef,
        run.repository.owner,
        run.repository.name,
      );
      return match?.testCaseId === testCaseId;
    });
  }

  const enriched = filtered.slice(0, limit).map(enrichRunSummary);
  res.json(toJson(enriched));
});

runsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const run = await prisma.qaRun.findUnique({
    where: { id },
    include: {
      repository: true,
      steps: { orderBy: { stepIndex: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
      _count: { select: { steps: true, evidence: true } },
    },
  });

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const enriched = await enrichRunDetail(run);
  res.json(toJson(enriched));
});

export const evidenceRouter: Router = createRouter();

evidenceRouter.get("/*splat", async (req: Request, res: Response) => {
  const splat = req.params.splat;
  const key = decodeURIComponent(
    typeof splat === "string" ? splat : Array.isArray(splat) ? splat.join("/") : "",
  );
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
