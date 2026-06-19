import { prisma } from "@accelute/db";
import type { EvidenceCuration, QaPlan, Verdict } from "@accelute/shared";
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { EvidenceStore, getEvidenceByKey } from "../evidence/r2.js";
import { renderReportHtml } from "../report/html.js";

export const reportsRouter: Router = createRouter();

reportsRouter.get("/:runId", async (req: Request, res: Response) => {
  const runId = String(req.params.runId);

  const run = await prisma.qaRun.findUnique({
    where: { id: runId },
    include: {
      repository: true,
      steps: { orderBy: { stepIndex: "asc" } },
    },
  });

  if (!run || !run.planJson || !run.verdictJson) {
    res.status(404).send("Report not found");
    return;
  }

  const evidenceStore = new EvidenceStore(runId, run.prNumber);
  const evidence = await evidenceStore.listForRun();
  const video = evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  const screenshots = evidence.filter((item) => item.type === "screenshot");

  let clientSummary = (run.verdictJson as Verdict).reason;
  const reportKey = `pr-${run.prNumber}/${runId}/qa-report.json`;
  const reportBlob = await getEvidenceByKey(reportKey);
  if (reportBlob) {
    try {
      const parsed = JSON.parse(reportBlob.body.toString("utf8")) as {
        curation?: EvidenceCuration;
      };
      if (parsed.curation?.clientSummary) {
        clientSummary = parsed.curation.clientSummary;
      }
    } catch {
      // use verdict reason
    }
  }

  const html = renderReportHtml({
    runId,
    prTitle: run.prTitle,
    prNumber: run.prNumber,
    owner: run.repository.owner,
    repo: run.repository.name,
    plan: run.planJson as QaPlan,
    verdict: run.verdictJson as Verdict,
    videoUrl: video?.url,
    screenshots,
    steps: run.steps.map((step) => ({
      description: step.name,
      status: step.status,
      action: step.action,
    })),
    clientSummary,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(html);
});
