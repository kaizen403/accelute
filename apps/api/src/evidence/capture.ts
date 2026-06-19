import type { QaStep, QaStepCapture } from "@accelute/shared";

export function resolveCapturePolicy(step: QaStep): QaStepCapture {
  if (step.capture) {
    return step.capture;
  }

  switch (step.action) {
    case "navigate":
      return "always";
    case "assert_visible":
    case "assert_text":
    case "check_console":
    case "click":
      return "on_failure";
    default:
      return "never";
  }
}

export function shouldCaptureScreenshot(
  step: QaStep,
  failed: boolean,
): boolean {
  const policy = resolveCapturePolicy(step);

  if (policy === "never") {
    return false;
  }

  if (policy === "always") {
    return true;
  }

  return failed;
}
