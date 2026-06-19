import type { VerdictStatus } from "./schemas.js";
import type { ExpectedVerdict } from "./suites/types.js";

export type CalibrationResult = "calibrated" | "mismatch";

export function calibrate(
  expectedVerdict: ExpectedVerdict,
  actualVerdict: VerdictStatus | null | undefined,
): CalibrationResult | null {
  if (!actualVerdict) return null;

  if (expectedVerdict === "should-fail") {
    return actualVerdict === "failed" || actualVerdict === "inconclusive"
      ? "calibrated"
      : "mismatch";
  }

  if (expectedVerdict === "should-pass") {
    return actualVerdict === "passed" ? "calibrated" : "mismatch";
  }

  return "mismatch";
}
