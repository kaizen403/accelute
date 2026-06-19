import { notFound } from "next/navigation";

import { RunReview } from "@/components/runs/RunReview";
import { AppShell } from "@/components/shell/AppShell";
import { fetchRun } from "@/lib/api";

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

  return (
    <AppShell activeNav="runs">
      <RunReview run={run} />
    </AppShell>
  );
}
