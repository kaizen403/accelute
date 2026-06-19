import { RunsTableSkeleton } from "@/components/glass/GlassSkeleton";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell activeNav="runs">
      <header className="mb-6">
        <div className="h-8 w-24 animate-shimmer rounded-lg bg-white/[0.06]" />
        <div className="mt-2 h-4 w-48 animate-shimmer rounded-lg bg-white/[0.06]" />
      </header>
      <GlassPanel className="mb-6 h-24 animate-shimmer bg-white/[0.04]" />
      <GlassPanel>
        <RunsTableSkeleton />
      </GlassPanel>
    </AppShell>
  );
}
