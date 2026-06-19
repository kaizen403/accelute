export type ExpectedVerdict = "should-pass" | "should-fail";
export type CalibrationResult = "calibrated" | "mismatch";

interface CalibrationBadgeProps {
  expectedVerdict: ExpectedVerdict;
  actualVerdict: string;
  calibration: CalibrationResult;
  className?: string;
}

function resultStyles(calibration: CalibrationResult): string {
  if (calibration === "calibrated") {
    return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25";
  }
  return "bg-rose-500/15 text-rose-400 ring-rose-500/25";
}

function formatExpected(expected: ExpectedVerdict): string {
  return expected === "should-pass" ? "should pass" : "should fail";
}

export function CalibrationBadge({
  expectedVerdict,
  actualVerdict,
  calibration,
  className = "",
}: CalibrationBadgeProps) {
  return (
    <div
      className={`inline-flex flex-col gap-1 rounded-lg px-3 py-2 ring-1 ring-inset ${resultStyles(calibration)} ${className}`.trim()}
    >
      <span className="text-xs font-medium uppercase tracking-wide">
        {calibration === "calibrated" ? "Calibrated" : "Mismatch"}
      </span>
      <span className="text-xs opacity-80">
        Expected {formatExpected(expectedVerdict)} · got {actualVerdict}
      </span>
    </div>
  );
}
