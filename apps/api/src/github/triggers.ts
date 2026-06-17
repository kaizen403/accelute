import type { ParsedQaCommand, QaTrigger } from "@accelute/shared";
import { ParsedQaCommandSchema } from "@accelute/shared";

const QA_COMMAND_REGEX = /\/qa(?:\s+(.+))?/i;
const URL_OVERRIDE_REGEX = /url=(https?:\/\/[^\s]+)/i;
const RETRY_REGEX = /\bretry\b/i;

export function parseQaComment(body: string): ParsedQaCommand | null {
  const match = body.match(QA_COMMAND_REGEX);
  if (!match) {
    return null;
  }

  const args = match[1]?.trim() ?? "";
  const urlMatch = args.match(URL_OVERRIDE_REGEX);

  if (RETRY_REGEX.test(args)) {
    return ParsedQaCommandSchema.parse({
      command: "retry",
      previewUrl: urlMatch?.[1],
    });
  }

  if (urlMatch) {
    return ParsedQaCommandSchema.parse({
      command: "url",
      previewUrl: urlMatch[1],
    });
  }

  return ParsedQaCommandSchema.parse({ command: "run" });
}

export function isQaLabel(label: string): boolean {
  return ["qa-needed", "qa", "needs-qa"].includes(label.toLowerCase());
}

export function mapTrigger(
  source: "comment" | "pr_opened" | "pr_updated" | "label" | "retry",
): QaTrigger {
  return source;
}
