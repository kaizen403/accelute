export interface WebhookInstallation {
  id: number;
  account: {
    login: string;
    type: string;
  };
}

export function getWebhookInstallation(
  installation: { id: number } & Record<string, unknown>,
  repository?: {
    owner: { login: string; type?: string };
  },
): WebhookInstallation {
  const installationAccount = installation.account as
    | WebhookInstallation["account"]
    | undefined;

  const account = installationAccount ?? {
    login: repository?.owner.login ?? "unknown",
    type: repository?.owner.type ?? "User",
  };

  return {
    id: installation.id,
    account,
  };
}
