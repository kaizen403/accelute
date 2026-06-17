import Link from "next/link";
import { notFound } from "next/navigation";

import { API_BASE, fetchRun } from "@/lib/api";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let run: Awaited<ReturnType<typeof fetchRun>>;
  try {
    run = await fetchRun(id);
  } catch {
    notFound();
  }

  const verdict = run.verdictJson as {
    status?: string;
    reason?: string;
    confidence?: number;
  } | null;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <p>
        <Link href="/">← Back to runs</Link>
      </p>

      <h1>
        #{run.prNumber} {run.prTitle}
      </h1>
      <p style={{ color: "#64748b" }}>
        {run.repository.owner}/{run.repository.name} · {run.status}
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Summary</h2>
        <ul>
          <li>Run ID: <code>{run.id}</code></li>
          <li>Trigger: {run.trigger}</li>
          <li>Commit: <code>{run.headSha}</code></li>
          <li>Preview: {run.previewUrl ?? "—"}</li>
          <li>Confidence: {run.confidence != null ? `${run.confidence}%` : "—"}</li>
          {verdict?.reason ? <li>Verdict: {verdict.reason}</li> : null}
          {run.errorMessage ? <li style={{ color: "#dc2626" }}>Error: {run.errorMessage}</li> : null}
        </ul>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Steps</h2>
        {run.steps.length === 0 ? (
          <p>No steps recorded yet.</p>
        ) : (
          <ol>
            {run.steps.map((step) => (
              <li key={step.id} style={{ marginBottom: "0.75rem" }}>
                <strong>{step.name}</strong> — {step.status}
                {step.errorMessage ? (
                  <div style={{ color: "#dc2626" }}>{step.errorMessage}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Evidence</h2>
        {run.evidence.length === 0 ? (
          <p>No evidence uploaded yet.</p>
        ) : (
          <ul>
            {run.evidence.map((item) => (
              <li key={item.id}>
                {item.label ?? item.type}:{" "}
                <a
                  href={`${API_BASE}/evidence/${encodeURIComponent(item.r2Key)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.r2Key}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
