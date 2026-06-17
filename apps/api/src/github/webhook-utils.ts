export interface WebhookInstallation {
  id: number;
  account: {
    login: string;
    type: string;
  };
}

export function getWebhookInstallation(
  installation: { id: number } & Record<string, unknown>,
): WebhookInstallation {
  const account = installation.account as WebhookInstallation["account"];
  return {
    id: installation.id,
    account,
  };
}
