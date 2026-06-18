import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { AcceluteRepoConfigSchema, type AcceluteRepoConfig } from "@accelute/shared";
import { parse as parseYaml } from "yaml";

import type { AppDetection, PackageManager } from "./detect.js";
import { getInstallCommand } from "./detect.js";
import { QaBlockedError } from "./errors.js";

const CONFIG_FILES = [".accelute.yml", ".accelute.yaml", ".accelute.json"];

function shellSplit(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

function expandPort(command: string[], port: number): string[] {
  return command.map((part) => part.replaceAll("{port}", String(port)));
}

async function readConfigFile(repoDir: string): Promise<unknown | null> {
  for (const filename of CONFIG_FILES) {
    const path = join(repoDir, filename);
    try {
      const raw = await readFile(path, "utf8");
      if (filename.endsWith(".json")) {
        return JSON.parse(raw) as unknown;
      }
      return parseYaml(raw) as unknown;
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadAcceluteConfig(
  repoDir: string,
): Promise<AcceluteRepoConfig | null> {
  const raw = await readConfigFile(repoDir);
  if (!raw) {
    return null;
  }

  const parsed = AcceluteRepoConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid .accelute config: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  return parsed.data;
}

export function detectionFromConfig(
  config: AcceluteRepoConfig,
  port: number,
  repoDir: string,
  packageManager: PackageManager,
): AppDetection {
  const installCommand = config.install
    ? Array.isArray(config.install)
      ? config.install
      : shellSplit(config.install)
    : getInstallCommand(config.packageManager ?? packageManager);

  const startCommand = config.start
    ? expandPort(
        Array.isArray(config.start) ? config.start : shellSplit(config.start),
        config.port ?? port,
      )
    : [];

  if (startCommand.length === 0) {
    throw new QaBlockedError(
      ".accelute config requires a start command when auto-detect is overridden.",
    );
  }

  return {
    packageManager: config.packageManager ?? packageManager,
    framework: "unknown",
    installCommand,
    startCommand,
    workdir: config.workdir ? join(repoDir, config.workdir) : undefined,
    readyPath: config.readyPath ?? "/",
    readyTimeoutMs: config.readyTimeoutMs,
  };
}
