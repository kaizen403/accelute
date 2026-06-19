import { GlassPanel } from "@/components/glass/GlassPanel";
import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell activeNav="suites">
      <header className="mb-8">
        <div className="h-8 w-32 animate-shimmer rounded-lg bg-white/[0.06]" />
        <div className="mt-2 h-4 w-56 animate-shimmer rounded-lg bg-white/[0.06]" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <GlassPanel key={i} className="h-32 animate-shimmer bg-white/[0.04]" />
        ))}
      </div>
    </AppShell>
  );
}
