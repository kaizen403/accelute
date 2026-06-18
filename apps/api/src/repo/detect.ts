import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  detectionFromConfig,
  loadAcceluteConfig,
} from "./accelute-config.js";

export type PackageManager = "pnpm" | "yarn" | "npm";

export type Framework = "next" | "vite" | "react-scripts" | "static" | "unknown";

export interface AppDetection {
  packageManager: PackageManager;
  framework: Framework;
  installCommand: string[];
  startCommand: string[];
  /** When set, install runs at repo root but the dev server starts in this subdirectory. */
  workdir?: string;
  readyPath?: string;
  readyTimeoutMs?: number;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(
  repoDir: string,
): Promise<PackageManager> {
  if (await fileExists(join(repoDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(join(repoDir, "yarn.lock"))) return "yarn";
  if (await fileExists(join(repoDir, "package-lock.json"))) return "npm";
  return "npm";
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function detectFramework(
  repoDir: string,
  port: number,
  packageManager: PackageManager,
): Promise<{ framework: Framework; startCommand: string[] }> {
  const packageJsonPath = join(repoDir, "package.json");
  if (!(await fileExists(packageJsonPath))) {
    if (await fileExists(join(repoDir, "index.html"))) {
      return {
        framework: "static",
        startCommand: ["npx", "serve", "-l", String(port)],
      };
    }
    return { framework: "unknown", startCommand: [] };
  }

  const raw = await readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw) as PackageJson;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.next) {
    return {
      framework: "next",
      startCommand: ["npx", "next", "dev", "-p", String(port)],
    };
  }

  if (deps.vite) {
    return {
      framework: "vite",
      startCommand: ["npx", "vite", "--port", String(port), "--host"],
    };
  }

  if (deps["react-scripts"]) {
    return {
      framework: "react-scripts",
      startCommand: getRunCommand(packageManager, "start"),
    };
  }

  if (await fileExists(join(repoDir, "index.html"))) {
    return {
      framework: "static",
      startCommand: ["npx", "serve", "-l", String(port)],
    };
  }

  if (pkg.scripts?.dev) {
    return {
      framework: "unknown",
      startCommand: getRunCommand(packageManager, "dev"),
    };
  }

  if (pkg.scripts?.start) {
    return {
      framework: "unknown",
      startCommand: getRunCommand(packageManager, "start"),
    };
  }

  return { framework: "unknown", startCommand: [] };
}

async function detectWorkspaceWebApp(
  repoDir: string,
  port: number,
  packageManager: PackageManager,
): Promise<AppDetection | null> {
  if (!(await fileExists(join(repoDir, "pnpm-workspace.yaml")))) {
    return null;
  }

  const appsDir = join(repoDir, "apps");
  if (!(await fileExists(appsDir))) {
    return null;
  }

  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(appsDir, { withFileTypes: true });
  const appNames = [
    "web",
    ...entries.filter((e) => e.isDirectory()).map((e) => e.name).filter((n) => n !== "web"),
  ];

  for (const name of appNames) {
    const appDir = join(appsDir, name);
    const packageJsonPath = join(appDir, "package.json");
    if (!(await fileExists(packageJsonPath))) continue;

    const raw = await readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as PackageJson;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) {
      return {
        packageManager,
        framework: "next",
        installCommand: getInstallCommand(packageManager),
        startCommand: ["npx", "next", "dev", "-p", String(port)],
        workdir: appDir,
      };
    }

    if (deps.vite) {
      return {
        packageManager,
        framework: "vite",
        installCommand: getInstallCommand(packageManager),
        startCommand: ["npx", "vite", "--port", String(port), "--host"],
        workdir: appDir,
      };
    }
  }

  return null;
}

export async function detectApp(
  repoDir: string,
  port: number,
): Promise<AppDetection> {
  const packageManager = await detectPackageManager(repoDir);
  const repoConfig = await loadAcceluteConfig(repoDir);

  if (repoConfig) {
    return detectionFromConfig(repoConfig, port, repoDir, packageManager);
  }

  const workspaceApp = await detectWorkspaceWebApp(repoDir, port, packageManager);
  if (workspaceApp) {
    return workspaceApp;
  }

  const { framework, startCommand } = await detectFramework(
    repoDir,
    port,
    packageManager,
  );

  return {
    packageManager,
    framework,
    installCommand: getInstallCommand(packageManager),
    startCommand,
  };
}

export function getRunCommand(
  packageManager: PackageManager,
  script: string,
): string[] {
  switch (packageManager) {
    case "pnpm":
      return ["pnpm", "run", script];
    case "yarn":
      return ["yarn", script];
    default:
      return ["npm", "run", script];
  }
}

export function getInstallCommand(packageManager: PackageManager): string[] {
  switch (packageManager) {
    case "pnpm":
      return ["pnpm", "install", "--frozen-lockfile"];
    case "yarn":
      return ["yarn", "install"];
    default:
      return ["npm", "install"];
  }
}
