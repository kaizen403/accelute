import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export const env = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  apiPort: Number(optionalEnv("API_PORT", "3001")),
  publicBaseUrl: optionalEnv("PUBLIC_BASE_URL", "http://localhost:3001"),

  githubAppId: process.env.GITHUB_APP_ID ?? "",
  githubAppPrivateKey: (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n",
  ),
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",

  fireworksApiKey: process.env.FIREWORKS_API_KEY ?? "",
  fireworksModel: optionalEnv(
    "FIREWORKS_MODEL",
    "accounts/fireworks/models/llama-v3p3-70b-instruct",
  ),

  databaseUrl: optionalEnv(
    "DATABASE_URL",
    "postgresql://accelute:accelute@localhost:5432/accelute",
  ),

  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: optionalEnv("R2_BUCKET", "qa-agent-evidence"),
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",

  cloneTmpDir: optionalEnv("CLONE_TMP_DIR", "/tmp/qa-agent-clones"),
  appStartTimeoutMs: Number(optionalEnv("APP_START_TIMEOUT_MS", "90000")),
  installTimeoutMs: Number(optionalEnv("INSTALL_TIMEOUT_MS", "300000")),
  videoMaxSeconds: Number(optionalEnv("VIDEO_MAX_SECONDS", "60")),
  cloneAndRunEnabled: optionalBool("CLONE_AND_RUN_ENABLED", true),
  allowForkClones: optionalBool("ALLOW_FORK_CLONES", false),

  browserBackend: optionalEnv("BROWSER_BACKEND", "playwright") as
    | "playwright"
    | "camofox",
  camofoxUrl: optionalEnv("CAMOFOX_URL", "http://localhost:9377"),
  evidenceTmpDir: optionalEnv("EVIDENCE_TMP_DIR", "/tmp/qa-agent-evidence"),
};

export function assertGithubConfigured(): void {
  requireEnv("GITHUB_APP_ID");
  requireEnv("GITHUB_APP_PRIVATE_KEY");
  requireEnv("GITHUB_WEBHOOK_SECRET");
}

export function isFireworksConfigured(): boolean {
  return Boolean(env.fireworksApiKey);
}

export function isR2Configured(): boolean {
  return Boolean(
    env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey,
  );
}
