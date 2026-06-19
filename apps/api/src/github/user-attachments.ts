import type { Octokit } from "@octokit/rest";

import { env } from "../config.js";

function githubCookie(session: string): string {
  return `user_session=${session}; __Host-user_session_same_site=${session}`;
}

function extractUploadToken(html: string): string | null {
  const match = html.match(/"uploadToken":"((?:\\.|[^"\\])*)"/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1] ?? null;
  }
}

async function fetchUploadToken(
  owner: string,
  repo: string,
  session: string,
): Promise<string> {
  const response = await fetch(`https://github.com/${owner}/${repo}`, {
    headers: {
      Cookie: githubCookie(session),
      Accept: "text/html",
      "User-Agent": "accelute-qa-agent",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load repository page (${response.status})`);
  }

  const html = await response.text();
  const token = extractUploadToken(html);
  if (!token) {
    throw new Error("uploadToken was not found on the repository page");
  }

  return token;
}

export async function uploadUserAttachment(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  filename: string;
  contentType: string;
  body: Buffer;
}): Promise<string> {
  const session = env.githubUserSession;
  if (!session) {
    throw new Error("GITHUB_USER_SESSION is not configured");
  }

  const { data: repository } = await params.octokit.rest.repos.get({
    owner: params.owner,
    repo: params.repo,
  });

  const uploadToken = await fetchUploadToken(
    params.owner,
    params.repo,
    session,
  );

  const policyForm = new FormData();
  policyForm.append("repository_id", String(repository.id));
  policyForm.append("name", params.filename);
  policyForm.append("size", String(params.body.byteLength));
  policyForm.append("content_type", params.contentType);
  policyForm.append("authenticity_token", uploadToken);

  const policyResponse = await fetch(
    "https://github.com/upload/policies/assets",
    {
      method: "POST",
      headers: {
        Cookie: githubCookie(session),
        Accept: "application/json",
        Origin: "https://github.com",
        Referer: `https://github.com/${params.owner}/${params.repo}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: policyForm,
    },
  );

  if (!policyResponse.ok) {
    const text = await policyResponse.text();
    throw new Error(
      `GitHub upload policy failed (${policyResponse.status}): ${text.slice(0, 300)}`,
    );
  }

  const policy = (await policyResponse.json()) as {
    upload_url: string;
    form: Record<string, string>;
    asset: { id: number; href: string };
    asset_upload_url: string;
    asset_upload_authenticity_token: string;
  };

  const s3Form = new FormData();
  for (const [key, value] of Object.entries(policy.form)) {
    s3Form.append(key, value);
  }
  s3Form.append(
    "file",
    new Blob([params.body], { type: params.contentType }),
    params.filename,
  );

  const s3Response = await fetch(policy.upload_url, {
    method: "POST",
    headers: {
      Origin: "https://github.com",
    },
    body: s3Form,
  });

  if (!s3Response.ok) {
    const text = await s3Response.text();
    throw new Error(
      `GitHub asset S3 upload failed (${s3Response.status}): ${text.slice(0, 300)}`,
    );
  }

  const finalizeForm = new FormData();
  finalizeForm.append(
    "authenticity_token",
    policy.asset_upload_authenticity_token,
  );

  const finalizeResponse = await fetch(
    `https://github.com${policy.asset_upload_url}`,
    {
      method: "PUT",
      headers: {
        Cookie: githubCookie(session),
        Accept: "application/json",
        Origin: "https://github.com",
        Referer: `https://github.com/${params.owner}/${params.repo}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: finalizeForm,
    },
  );

  if (!finalizeResponse.ok) {
    const text = await finalizeResponse.text();
    throw new Error(
      `GitHub asset finalize failed (${finalizeResponse.status}): ${text.slice(0, 300)}`,
    );
  }

  return policy.asset.href;
}

export function videoAttachmentMarkdown(href: string): string {
  return `\n${href}\n`;
}

export function imageAttachmentMarkdown(label: string, href: string): string {
  return `![${label}](${href})`;
}

export function linkedImageMarkdown(
  label: string,
  imageUrl: string,
  linkUrl: string,
): string {
  return `[![${label}](${imageUrl})](${linkUrl})`;
}
