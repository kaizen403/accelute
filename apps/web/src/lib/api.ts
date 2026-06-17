export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface QaRunSummary {
  id: string;
  prNumber: number;
  prTitle: string;
  status: string;
  confidence: number | null;
  previewUrl: string | null;
  createdAt: string;
  repository: {
    owner: string;
    name: string;
  };
  _count?: {
    steps: number;
    evidence: number;
  };
}

export interface QaRunDetail extends QaRunSummary {
  headSha: string;
  trigger: string;
  planJson: unknown;
  verdictJson: unknown;
  errorMessage: string | null;
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

export async function fetchRuns(): Promise<QaRunSummary[]> {
  const response = await fetch(`${API_BASE}/runs`, { cache: "no-store" });
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
