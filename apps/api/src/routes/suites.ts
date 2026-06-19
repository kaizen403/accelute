import { prisma } from "@accelute/db";
import {
  calibrate,
  getAllSuites,
  getSuiteById,
  type Verdict,
} from "@accelute/shared";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import {
  enrichRunSummary,
  getGithubPrUrl,
  getReportUrl,
  getVerdictStatus,
} from "./run-enrichment.js";

function toJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}

export const suitesRouter: Router = createRouter();

suitesRouter.get("/", (_req: Request, res: Response) => {
  res.json(toJson(getAllSuites()));
});

suitesRouter.get("/:id/summary", async (req: Request, res: Response) => {
  const suiteId = String(req.params.id);
  const suite = getSuiteById(suiteId);

  if (!suite) {
    res.status(404).json({ error: "Suite not found" });
    return;
  }

  const runs = await prisma.qaRun.findMany({
    where: {
      repository: {
        owner: suite.repository.owner,
        name: suite.repository.name,
      },
      headRef: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: { repository: true },
  });

  const cases = suite.cases.map((testCase) => {
    const latestRun = runs.find((run) =>
      run.headRef?.startsWith(testCase.branchPrefix),
    );

    if (!latestRun) {
      return {
        testCase,
        latestRun: null,
        calibration: null,
      };
    }

    const verdict = latestRun.verdictJson as Verdict | null;
    const calibration = verdict
      ? calibrate(testCase.expectedVerdict, verdict.status)
      : null;

    return {
      testCase,
      latestRun: {
        id: latestRun.id,
        status: latestRun.status,
        headRef: latestRun.headRef,
        prNumber: latestRun.prNumber,
        prTitle: latestRun.prTitle,
        createdAt: latestRun.createdAt,
        verdictStatus: getVerdictStatus(latestRun),
        reportUrl: getReportUrl(latestRun.id),
        githubPrUrl: getGithubPrUrl(latestRun),
      },
      calibration: calibration
        ? {
            result: calibration,
            expectedVerdict: testCase.expectedVerdict,
            actualVerdict: verdict?.status ?? null,
          }
        : null,
    };
  });

  res.json(
    toJson({
      suite,
      cases,
    }),
  );
});
