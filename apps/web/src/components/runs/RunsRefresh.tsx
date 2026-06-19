"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

const POLL_INTERVAL_MS = 30_000;

export function RunsRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-lg border border-glass-border bg-white/[0.04] px-3 py-1.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
