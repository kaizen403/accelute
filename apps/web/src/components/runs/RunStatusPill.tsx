interface RunStatusPillProps {
  status: string;
  className?: string;
}

function statusStyles(status: string): string {
  const normalized = status.toLowerCase();

  if (
    normalized === "reported" ||
    normalized === "passed" ||
    normalized === "calibrated"
  ) {
    return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25";
  }

  if (normalized === "failed" || normalized === "error") {
    return "bg-rose-500/15 text-rose-400 ring-rose-500/25";
  }

  if (normalized === "blocked" || normalized === "inconclusive") {
    return "bg-amber-500/15 text-amber-400 ring-amber-500/25";
  }

  return "bg-slate-500/15 text-slate-400 ring-slate-500/25";
}

export function RunStatusPill({ status, className = "" }: RunStatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusStyles(status)} ${className}`.trim()}
    >
      {status}
    </span>
  );
}
