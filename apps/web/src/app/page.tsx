import Link from "next/link";

import { fetchRuns } from "@/lib/api";

function statusColor(status: string): string {
  switch (status) {
    case "reported":
      return "#16a34a";
    case "failed":
    case "error":
      return "#dc2626";
    case "blocked":
      return "#ca8a04";
    default:
      return "#2563eb";
  }
}

export default async function HomePage() {
  let runs: Awaited<ReturnType<typeof fetchRuns>> = [];
  let error: string | null = null;

  try {
    runs = await fetchRuns();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load runs";
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Accelute QA Agent</h1>
        <p style={{ color: "#64748b" }}>
          Dashboard for GitHub PR QA runs, evidence, and verdicts.
        </p>
      </header>

      {error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : runs.length === 0 ? (
        <p>No QA runs yet. Trigger one with <code>/qa</code> on a pull request.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">PR</th>
              <th align="left">Repo</th>
              <th align="left">Status</th>
              <th align="left">Confidence</th>
              <th align="left">Created</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.75rem 0" }}>
                  <Link href={`/runs/${run.id}`}>#{run.prNumber}</Link>
                  <div style={{ fontSize: 14, color: "#475569" }}>{run.prTitle}</div>
                </td>
                <td>
                  {run.repository.owner}/{run.repository.name}
                </td>
                <td style={{ color: statusColor(run.status) }}>{run.status}</td>
                <td>{run.confidence != null ? `${run.confidence}%` : "—"}</td>
                <td>{new Date(run.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
