export class QaBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QaBlockedError";
  }
}

export function isBlockedError(error: unknown): boolean {
  if (error instanceof QaBlockedError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Could not detect a supported JS framework") ||
    message.includes("Dependency install failed") ||
    message.includes("Dev server did not become ready") ||
    message.includes("No preview deployment URL was found") ||
    message.includes("clone-and-run is disabled") ||
    message.includes("Fork PR clone is disabled") ||
    message.includes("Cannot clone fork repository") ||
    message.includes("Could not clone repository")
  );
}
