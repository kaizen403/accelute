import { QA_COMMENT_MARKER } from "@accelute/shared";

import type { InstallationOctokit } from "./types.js";

export async function upsertQaComment(params: {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
  existingCommentId?: bigint | null;
}): Promise<bigint> {
  const content = `${QA_COMMENT_MARKER}\n${params.body}`;

  if (params.existingCommentId) {
    const response = await params.octokit.rest.issues.updateComment({
      owner: params.owner,
      repo: params.repo,
      comment_id: Number(params.existingCommentId),
      body: content,
    });

    return BigInt(response.data.id);
  }

  const comments = await params.octokit.rest.issues.listComments({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    per_page: 100,
  });

  const existing = comments.data.find((comment) =>
    comment.body?.includes(QA_COMMENT_MARKER),
  );

  if (existing) {
    const response = await params.octokit.rest.issues.updateComment({
      owner: params.owner,
      repo: params.repo,
      comment_id: existing.id,
      body: content,
    });

    return BigInt(response.data.id);
  }

  const response = await params.octokit.rest.issues.createComment({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    body: content,
  });

  return BigInt(response.data.id);
}
