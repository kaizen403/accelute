import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

import { env } from "../config.js";

import { loadAcceluteConfig } from "./accelute-config.js";
import { detectApp } from "./detect.js";
import { QaBlockedError } from "./errors.js";

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not allocate a free port"));
      }
    });
    server.on("error", reject);
  });
}

function runCommand(
  command: string[],
  cwd: string,
  envVars?: Record<string, string>,
  timeoutMs?: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command;
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, ...envVars },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            child.kill("SIGTERM");
            reject(
              new Error(
                `Command timed out after ${timeoutMs}ms: ${command.join(" ")}`,
              ),
            );
          }, timeoutMs)
        : undefined;

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function waitForHttp(
  port: number,
  timeoutMs: number,
  path = "/",
): Promise<boolean> {
  const readyPath = path.startsWith("/") ? path : `/${path}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${readyPath}`, {
        signal: AbortSignal.timeout(2_000),
        redirect: "follow",
      });
      if (response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return false;
}

export interface AppRunner {
  port: number;
  url: string;
  logs: string;
  stop(): Promise<void>;
}

export async function startApp(repoDir: string): Promise<AppRunner> {
  const repoConfig = await loadAcceluteConfig(repoDir);
  const port = repoConfig?.port ?? (await getFreePort());
  const detection = await detectApp(repoDir, port);

  if (detection.framework === "unknown" || detection.startCommand.length === 0) {
    throw new QaBlockedError(
      "Could not detect a supported JS framework or start command for this repository. Add a `.accelute.yml` with install/start commands.",
    );
  }

  const installResult = await runCommand(
    detection.installCommand,
    repoDir,
    undefined,
    env.installTimeoutMs,
  );

  if (installResult.code !== 0) {
    throw new QaBlockedError(
      `Dependency install failed:\n${installResult.stderr.slice(-2000) || installResult.stdout.slice(-2000)}`,
    );
  }

  const logs: string[] = [
    installResult.stdout,
    installResult.stderr,
  ].filter(Boolean);

  const startCwd = detection.workdir ?? repoDir;
  const [bin, ...args] = detection.startCommand;
  const child: ChildProcess = spawn(bin, args, {
    cwd: startCwd,
    env: {
      ...process.env,
      PORT: String(port),
      BROWSER: "none",
      CI: "true",
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    logs.push(chunk.toString());
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    logs.push(chunk.toString());
  });

  const readyTimeout = detection.readyTimeoutMs ?? env.appStartTimeoutMs;
  const ready = await waitForHttp(
    port,
    readyTimeout,
    detection.readyPath ?? "/",
  );

  if (!ready) {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    throw new QaBlockedError(
      `Dev server did not become ready within ${readyTimeout}ms.\n${logs.join("").slice(-2000)}`,
    );
  }

  return {
    port,
    url: `http://127.0.0.1:${port}`,
    logs: logs.join(""),
    stop: async () => {
      if (!child.pid) return;

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try {
            process.kill(-child.pid!, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
          resolve();
        }, 5_000);

        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });

        try {
          process.kill(-child.pid!, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      });
    },
  };
}
