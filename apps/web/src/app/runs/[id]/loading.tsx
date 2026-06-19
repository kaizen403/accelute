import { RunReviewSkeleton } from "@/components/glass/GlassSkeleton";
import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell activeNav="runs">
      <RunReviewSkeleton />
    </AppShell>
  );
}
