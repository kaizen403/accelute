import type { QaRun, Repository } from "@accelute/db";
import {
  calibrate,
  matchRunToTestCase,
  type EvidenceCuration,
  type Verdict,
  type VerdictStatus,
} from "@accelute/shared";

import { env } from "../config.js";
import { EvidenceStore, getEvidenceByKey } from "../evidence/r2.js";

type RunWithRepository = QaRun & { repository: Repository };

export function getVerdictStatus(run: QaRun): VerdictStatus | null {
  if (!run.verdictJson) return null;
  return (run.verdictJson as Verdict).status;
}

export function getRunTags(run: RunWithRepository) {
  const match = matchRunToTestCase(
    run.headRef,
    run.repository.owner,
    run.repository.name,
  );

  if (!match) return null;

  return {
    suiteId: match.suiteId,
    testCaseId: match.testCaseId,
  };
}

export function getGithubPrUrl(run: RunWithRepository): string {
  return `https://github.com/${run.repository.owner}/${run.repository.name}/pull/${run.prNumber}`;
}

export function getReportUrl(runId: string): string {
  return `${env.publicBaseUrl.replace(/\/$/, "")}/reports/${runId}`;
}

export function enrichRunSummary(run: RunWithRepository) {
  const verdict = run.verdictJson as Verdict | null;
  const tags = getRunTags(run);

  return {
    id: run.id,
    repositoryId: run.repositoryId,
    prNumber: run.prNumber,
    prTitle: run.prTitle,
    headSha: run.headSha,
    headRef: run.headRef,
    trigger: run.trigger,
    previewUrl: run.previewUrl,
    status: run.status,
    confidence: run.confidence,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    repository: run.repository,
    verdictStatus: verdict?.status ?? null,
    tags,
    reportUrl: getReportUrl(run.id),
    githubPrUrl: getGithubPrUrl(run),
  };
}

export async function enrichRunDetail(run: RunWithRepository & {
  steps: Array<{
    id: string;
    stepIndex: number;
    name: string;
    action: string;
    status: string;
    expected: string | null;
    observed: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    r2Key: string;
    contentType: string | null;
    label: string | null;
    createdAt: Date;
  }>;
  _count?: { steps: number; evidence: number };
}) {
  const summary = enrichRunSummary(run);
  const verdict = run.verdictJson as Verdict | null;
  const match = matchRunToTestCase(
    run.headRef,
    run.repository.owner,
    run.repository.name,
  );

  const evidenceStore = new EvidenceStore(run.id, run.prNumber);
  const evidenceRefs = await evidenceStore.listForRun();
  const video = evidenceRefs.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  const screenshots = evidenceRefs.filter((item) => item.type === "screenshot");

  let clientSummary = verdict?.reason;
  const reportKey = `pr-${run.prNumber}/${run.id}/qa-report.json`;
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

  const calibration =
    match && verdict
      ? calibrate(match.testCase.expectedVerdict, verdict.status)
      : null;

  return {
    ...summary,
    planJson: run.planJson,
    verdictJson: run.verdictJson,
    checklist: verdict?.checklist ?? null,
    calibration: calibration
      ? {
          result: calibration,
          expectedVerdict: match!.testCase.expectedVerdict,
          actualVerdict: verdict!.status,
        }
      : null,
    clientSummary: clientSummary ?? null,
    videoUrl: video?.url ?? null,
    screenshots: screenshots.map((item) => ({
      key: item.key,
      url: item.url,
      label: item.label,
    })),
    steps: run.steps,
    evidence: run.evidence,
    _count: run._count,
  };
}
