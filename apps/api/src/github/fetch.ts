import type { PrContext } from "@accelute/shared";

import type { InstallationOctokit } from "./types.js";

const CLOSING_KEYWORDS =
  /(?:close[sd]?|fixe[sd]?|resolve[sd]?)\s+#(\d+)/gi;

const ISSUE_REF_REGEX = /#(\d+)/g;

const PREVIEW_URL_PATTERNS = [
  /https?:\/\/[^\s]*vercel\.app[^\s)>\]]*/gi,
  /https?:\/\/[^\s]*netlify\.app[^\s)>\]]*/gi,
  /https?:\/\/[^\s]*onrender\.com[^\s)>\]]*/gi,
  /https?:\/\/[^\s]*github\.io[^\s)>\]]*/gi,
];

function extractLinkedIssueNumber(
  prTitle: string,
  prBody: string,
): number | null {
  const text = `${prTitle}\n${prBody}`;
  const closingMatches = [...text.matchAll(CLOSING_KEYWORDS)];
  if (closingMatches.length > 0) {
    return Number(closingMatches[0][1]);
  }

  const issueMatches = [...text.matchAll(ISSUE_REF_REGEX)];
  if (issueMatches.length > 0) {
    return Number(issueMatches[0][1]);
  }

  return null;
}

export function extractPreviewUrlsFromText(text: string): string[] {
  const urls = new Set<string>();

  for (const pattern of PREVIEW_URL_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      urls.add(match[0].replace(/[.,;]+$/, ""));
    }
  }

  return [...urls];
}

export async function fetchPrContext(params: {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  prNumber: number;
  previewUrlOverride?: string;
}): Promise<PrContext> {
  const { octokit, owner, repo, prNumber } = params;

  const prResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const pr = prResponse.data;
  const prTitle = pr.title;
  const prBody = pr.body ?? "";
  const headSha = pr.head.sha;

  const filesResponse = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const changedFiles = filesResponse.data.map((file) => file.filename);

  let diff = "";
  try {
    const diffResponse = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: pr.base.sha,
      head: pr.head.sha,
      headers: { accept: "application/vnd.github.v3.diff" },
    });
    const diffBody = diffResponse.data as unknown;
    diff =
      typeof diffBody === "string" ? diffBody.slice(0, 12000) : "";
  } catch {
    diff = changedFiles.map((file) => `changed: ${file}`).join("\n");
  }

  const commentsResponse = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 50,
  });

  const comments = commentsResponse.data.map((comment) => ({
    author: comment.user?.login ?? "unknown",
    body: comment.body ?? "",
  }));

  let linkedIssue: PrContext["linkedIssue"];
  const issueNumber = extractLinkedIssueNumber(prTitle, prBody);

  if (issueNumber) {
    try {
      const issueResponse = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      linkedIssue = {
        number: issueResponse.data.number,
        title: issueResponse.data.title,
        body: issueResponse.data.body ?? undefined,
      };
    } catch {
      linkedIssue = undefined;
    }
  }

  const commentText = comments.map((c) => c.body).join("\n");
  const previewFromComments = extractPreviewUrlsFromText(commentText)[0];

  return {
    owner,
    repo,
    prNumber,
    prTitle,
    prBody,
    headSha,
    baseRef: pr.base.ref,
    linkedIssue,
    changedFiles,
    diff,
    comments,
    previewUrlOverride: params.previewUrlOverride,
    deploymentUrl: previewFromComments,
  };
}

export async function fetchCommitStatusPreviewUrl(params: {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  sha: string;
}): Promise<string | undefined> {
  const response = await params.octokit.rest.repos.listCommitStatusesForRef({
    owner: params.owner,
    repo: params.repo,
    ref: params.sha,
    per_page: 100,
  });

  for (const status of response.data) {
    if (status.target_url) {
      const urls = extractPreviewUrlsFromText(status.target_url);
      if (urls[0]) {
        return urls[0];
      }
    }
  }

  return undefined;
}
