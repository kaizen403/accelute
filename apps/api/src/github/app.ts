import { createAppAuth } from "@octokit/auth-app";
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

import { env } from "../config.js";

let app: App | null = null;

export function getGithubApp(): App {
  if (!app) {
    if (!env.githubAppId || !env.githubAppPrivateKey) {
      throw new Error("GitHub App is not configured");
    }

    app = new App({
      appId: env.githubAppId,
      privateKey: env.githubAppPrivateKey,
      oauth: env.githubClientId
        ? {
            clientId: env.githubClientId,
            clientSecret: env.githubClientSecret,
          }
        : undefined,
    });
  }

  return app;
}

export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  if (!env.githubAppId || !env.githubAppPrivateKey) {
    throw new Error("GitHub App is not configured");
  }

  const auth = createAppAuth({
    appId: env.githubAppId,
    privateKey: env.githubAppPrivateKey,
    installationId,
  });

  const result = await auth({ type: "installation" });
  return result.token;
}

export async function getInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
  if (!env.githubAppId || !env.githubAppPrivateKey) {
    throw new Error("GitHub App is not configured");
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.githubAppId,
      privateKey: env.githubAppPrivateKey,
      installationId,
    },
  });
}
