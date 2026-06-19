import { z } from "zod";

export const QaStepActionSchema = z.enum([
  "navigate",
  "click",
  "type",
  "select",
  "assert_visible",
  "assert_text",
  "wait",
  "check_console",
  "scroll",
]);

export const QaStepTargetSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  selector: z.string().optional(),
  label: z.string().optional(),
});

export const QaStepCaptureSchema = z.enum(["always", "on_failure", "never"]);

export const QaStepPrioritySchema = z.enum([
  "critical",
  "supporting",
  "diagnostic",
]);

export const QaStepAssertionSchema = z.object({
  type: z.enum(["visible", "text", "url", "console_clean"]),
  expected: z.string().optional(),
});

export const QaStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  action: QaStepActionSchema,
  target: QaStepTargetSchema.optional(),
  value: z.string().optional(),
  assertion: QaStepAssertionSchema.optional(),
  capture: QaStepCaptureSchema.optional(),
  priority: QaStepPrioritySchema.optional(),
});

export const QaPlanSchema = z.object({
  goal: z.string(),
  expected_result: z.string(),
  test_steps: z.array(QaStepSchema).min(1),
});

export const StepStatusSchema = z.enum(["passed", "failed", "skipped"]);

export const EvidenceRefSchema = z.object({
  type: z.enum(["screenshot", "video", "trace", "console", "network", "report", "dom"]),
  key: z.string(),
  url: z.string().optional(),
  label: z.string().optional(),
});

export const StepResultSchema = z.object({
  stepId: z.string(),
  description: z.string(),
  status: StepStatusSchema,
  action: QaStepActionSchema,
  expected: z.string().optional(),
  observed: z.string().optional(),
  errorMessage: z.string().optional(),
  usedAiFallback: z.boolean().optional(),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const VerdictStatusSchema = z.enum([
  "passed",
  "failed",
  "inconclusive",
  "blocked",
]);

export const ChecklistItemSchema = z.object({
  label: z.string(),
  ok: z.boolean(),
});

export const VerdictSchema = z.object({
  status: VerdictStatusSchema,
  confidence: z.number().min(0).max(100),
  reason: z.string(),
  checklist: z.array(ChecklistItemSchema),
  suggestedNextStep: z.string().optional(),
});

export const EvidenceCurationSchema = z.object({
  clientSummary: z.string(),
  highlightStepId: z.string().optional(),
  commentScreenshotKeys: z.array(z.string()).max(3).default([]),
  showSessionPreview: z.boolean().default(true),
});

export const QaTriggerSchema = z.enum([
  "comment",
  "pr_opened",
  "pr_updated",
  "label",
  "retry",
  "manual",
]);

export const QaRunStatusSchema = z.enum([
  "queued",
  "understanding",
  "resolving_preview",
  "cloning",
  "starting_app",
  "running",
  "judging",
  "reported",
  "blocked",
  "error",
]);

export const ParsedQaCommandSchema = z.object({
  command: z.enum(["run", "retry", "url"]),
  previewUrl: z.string().url().optional(),
});

export const AcceluteRepoConfigSchema = z.object({
  install: z.union([z.string(), z.array(z.string())]).optional(),
  start: z.union([z.string(), z.array(z.string())]).optional(),
  workdir: z.string().optional(),
  port: z.number().int().positive().optional(),
  readyPath: z.string().optional(),
  readyTimeoutMs: z.number().int().positive().optional(),
  packageManager: z.enum(["pnpm", "yarn", "npm"]).optional(),
});

export const PrContextSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
  prTitle: z.string(),
  prBody: z.string().optional(),
  headSha: z.string(),
  headCloneUrl: z.string().optional(),
  headRef: z.string().optional(),
  headRepoFullName: z.string().optional(),
  baseRef: z.string().optional(),
  linkedIssue: z
    .object({
      number: z.number(),
      title: z.string(),
      body: z.string().optional(),
    })
    .optional(),
  changedFiles: z.array(z.string()).default([]),
  diff: z.string().optional(),
  comments: z
    .array(
      z.object({
        author: z.string(),
        body: z.string(),
      }),
    )
    .default([]),
  deploymentUrl: z.string().url().optional(),
  previewUrlOverride: z.string().url().optional(),
});

export type QaStepAction = z.infer<typeof QaStepActionSchema>;
export type QaStepTarget = z.infer<typeof QaStepTargetSchema>;
export type QaStepCapture = z.infer<typeof QaStepCaptureSchema>;
export type QaStepPriority = z.infer<typeof QaStepPrioritySchema>;
export type QaStep = z.infer<typeof QaStepSchema>;
export type QaPlan = z.infer<typeof QaPlanSchema>;
export type StepStatus = z.infer<typeof StepStatusSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type StepResult = z.infer<typeof StepResultSchema>;
export type VerdictStatus = z.infer<typeof VerdictStatusSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type EvidenceCuration = z.infer<typeof EvidenceCurationSchema>;
export type QaTrigger = z.infer<typeof QaTriggerSchema>;
export type QaRunStatus = z.infer<typeof QaRunStatusSchema>;
export type ParsedQaCommand = z.infer<typeof ParsedQaCommandSchema>;
export type AcceluteRepoConfig = z.infer<typeof AcceluteRepoConfigSchema>;
export type PrContext = z.infer<typeof PrContextSchema>;

export const QA_COMMENT_MARKER = "<!-- qa-agent-report -->";
