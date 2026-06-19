import { GlassPanel } from "@/components/glass/GlassPanel";
import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell activeNav="suites">
      <div className="mb-6 h-4 w-16 animate-shimmer rounded bg-white/[0.06]" />
      <header className="mb-8">
        <div className="h-8 w-64 animate-shimmer rounded-lg bg-white/[0.06]" />
        <div className="mt-2 h-4 w-40 animate-shimmer rounded-lg bg-white/[0.06]" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GlassPanel key={i} className="h-48 animate-shimmer bg-white/[0.04]" />
        ))}
      </div>
    </AppShell>
  );
}
