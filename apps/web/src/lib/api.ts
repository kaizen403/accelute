export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type VerdictStatus = "passed" | "failed" | "inconclusive" | "blocked";
export type CalibrationResult = "calibrated" | "mismatch";
export type ExpectedVerdict = "should-pass" | "should-fail";

export interface RunTags {
  suiteId: string;
  testCaseId: string;
}

export interface RunCalibration {
  result: CalibrationResult;
  expectedVerdict: ExpectedVerdict;
  actualVerdict: VerdictStatus;
}

export interface ChecklistItem {
  label: string;
  ok: boolean;
}

export interface RunScreenshot {
  key: string;
  url: string;
  label: string | null;
}

export interface QaRunSummary {
  id: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  headSha: string;
  headRef: string | null;
  trigger: string;
  previewUrl: string | null;
  status: string;
  confidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  repository: {
    owner: string;
    name: string;
  };
  verdictStatus: VerdictStatus | null;
  tags: RunTags | null;
  reportUrl: string;
  githubPrUrl: string;
  _count?: {
    steps: number;
    evidence: number;
  };
}

export interface QaRunDetail extends QaRunSummary {
  planJson: unknown;
  verdictJson: unknown;
  checklist: ChecklistItem[] | null;
  calibration: RunCalibration | null;
  clientSummary: string | null;
  videoUrl: string | null;
  screenshots: RunScreenshot[];
  steps: Array<{
    id: string;
    stepIndex: number;
    name: string;
    action: string;
    status: string;
    expected: string | null;
    observed: string | null;
    errorMessage: string | null;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    r2Key: string;
    label: string | null;
    contentType: string | null;
  }>;
}

export interface QaSuite {
  id: string;
  title: string;
  repository: { owner: string; name: string };
  cases: Array<{
    id: string;
    branchPrefix: string;
    branchNameHint: string;
    title: string;
    difficulty: string;
    type: string;
    expectedVerdict: ExpectedVerdict;
  }>;
}

export interface SuiteCaseSummary {
  testCase: QaSuite["cases"][number];
  latestRun: {
    id: string;
    status: string;
    headRef: string | null;
    prNumber: number;
    prTitle: string;
    createdAt: string;
    verdictStatus: VerdictStatus | null;
    reportUrl: string;
    githubPrUrl: string;
  } | null;
  calibration: RunCalibration | null;
}

export interface SuiteSummary {
  suite: QaSuite;
  cases: SuiteCaseSummary[];
}

export interface FetchRunsParams {
  status?: string;
  owner?: string;
  repo?: string;
  suite?: string;
  testCase?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchRuns(
  params: FetchRunsParams = {},
): Promise<QaRunSummary[]> {
  const query = buildQuery({
    status: params.status,
    owner: params.owner,
    repo: params.repo,
    suite: params.suite,
    testCase: params.testCase,
    limit: params.limit,
  });
  const response = await fetch(`${API_BASE}/runs${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch runs");
  }
  return response.json();
}

export async function fetchRun(id: string): Promise<QaRunDetail> {
  const response = await fetch(`${API_BASE}/runs/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch run");
  }
  return response.json();
}

export async function fetchSuites(): Promise<QaSuite[]> {
  const response = await fetch(`${API_BASE}/suites`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch suites");
  }
  return response.json();
}

export async function fetchSuiteSummary(id: string): Promise<SuiteSummary> {
  const response = await fetch(`${API_BASE}/suites/${id}/summary`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch suite summary");
  }
  return response.json();
}
