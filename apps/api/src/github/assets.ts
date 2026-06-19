import type { EvidenceRef } from "@accelute/shared";
import type { Octokit } from "@octokit/rest";

import { env } from "../config.js";
import { buildPlayButtonPoster } from "../evidence/poster.js";
import { EvidenceStore, getEvidenceByKey } from "../evidence/r2.js";
import { extractPosterFrame, transcodeMp4ToGif } from "../video/process.js";
import {
  imageAttachmentMarkdown,
  linkedImageMarkdown,
  uploadUserAttachment,
  videoAttachmentMarkdown,
} from "./user-attachments.js";

const EVIDENCE_BRANCH = "accelute-qa-evidence";

export type CommentAttachment = {
  markdown: string;
  order: number;
};

function evidenceRepoPath(
  prNumber: number,
  runId: string,
  filename: string,
): string {
  return `.accelute/qa/pr-${prNumber}/${runId}/${filename}`;
}

function rawUrl(owner: string, repo: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${EVIDENCE_BRANCH}/${path}`;
}

function contentTypeForFilename(filename: string): string {
  if (filename.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (filename.endsWith(".png")) {
    return "image/png";
  }

  if (filename.endsWith(".gif")) {
    return "image/gif";
  }

  return "application/octet-stream";
}

async function ensureEvidenceBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  try {
    await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${EVIDENCE_BRANCH}`,
    });
    return;
  } catch {
    // Branch missing — create from default branch tip.
  }

  const { data: repository } = await octokit.rest.repos.get({ owner, repo });
  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${repository.default_branch}`,
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${EVIDENCE_BRANCH}`,
    sha: baseRef.object.sha,
  });
}

async function uploadRepoFile(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  path: string;
  body: Buffer;
  message: string;
}): Promise<string> {
  let sha: string | undefined;

  try {
    const { data } = await params.octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: EVIDENCE_BRANCH,
    });

    if (!Array.isArray(data) && "sha" in data) {
      sha = data.sha;
    }
  } catch {
    // New file.
  }

  await params.octokit.rest.repos.createOrUpdateFileContents({
    owner: params.owner,
    repo: params.repo,
    path: params.path,
    message: params.message,
    content: params.body.toString("base64"),
    branch: EVIDENCE_BRANCH,
    sha,
  });

  return rawUrl(params.owner, params.repo, params.path);
}

async function uploadNativeGithubVideo(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  evidence: EvidenceRef[];
}): Promise<CommentAttachment | null> {
  if (!env.githubUserSession) {
    return null;
  }

  const video = params.evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  if (!video) {
    return null;
  }

  const filename = video.key.split("/").pop();
  if (!filename) {
    return null;
  }

  const downloaded = await getEvidenceByKey(video.key);
  if (!downloaded) {
    return null;
  }

  try {
    const href = await uploadUserAttachment({
      octokit: params.octokit,
      owner: params.owner,
      repo: params.repo,
      filename,
      contentType: "video/mp4",
      body: downloaded.body,
    });

    return {
      order: 0,
      markdown: videoAttachmentMarkdown(href),
    };
  } catch {
    return null;
  }
}

async function buildSessionPosterImage(params: {
  evidence: EvidenceRef[];
  posterScreenshotKey?: string;
}): Promise<Buffer | null> {
  if (params.posterScreenshotKey) {
    const screenshot = params.evidence.find(
      (item) => item.key === params.posterScreenshotKey,
    );
    if (screenshot) {
      const downloaded = await getEvidenceByKey(screenshot.key);
      if (downloaded) {
        try {
          return await buildPlayButtonPoster(downloaded.body);
        } catch {
          // Fall through to video frame.
        }
      }
    }
  }

  const video = params.evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  if (!video) {
    return null;
  }

  const downloaded = await getEvidenceByKey(video.key);
  if (!downloaded) {
    return null;
  }

  try {
    return await extractPosterFrame(downloaded.body);
  } catch {
    return null;
  }
}

async function uploadSessionPreview(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  runId: string;
  reportUrl: string;
  evidence: EvidenceRef[];
  posterScreenshotKey?: string;
}): Promise<CommentAttachment | null> {
  const video = params.evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  if (!video && !params.posterScreenshotKey) {
    return null;
  }

  try {
    const poster = await buildSessionPosterImage(params);
    if (!poster) {
      return null;
    }

    await ensureEvidenceBranch(params.octokit, params.owner, params.repo);

    const posterPath = evidenceRepoPath(
      params.prNumber,
      params.runId,
      "session-poster.jpg",
    );
    const posterUrl = await uploadRepoFile({
      octokit: params.octokit,
      owner: params.owner,
      repo: params.repo,
      path: posterPath,
      body: poster,
      message: `chore(qa): attach session poster for run ${params.runId}`,
    });

    const videoUrl = `${params.reportUrl}#session`;

    return {
      order: 0,
      markdown: linkedImageMarkdown(
        "QA session recording — click to play",
        posterUrl,
        videoUrl,
      ),
    };
  } catch {
    return null;
  }
}

async function uploadScreenshotAttachments(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  runId: string;
  evidence: EvidenceRef[];
  selectedScreenshotKeys?: string[];
}): Promise<CommentAttachment[]> {
  let screenshots = params.evidence.filter((item) => item.type === "screenshot");

  if (params.selectedScreenshotKeys && params.selectedScreenshotKeys.length > 0) {
    const allowed = new Set(params.selectedScreenshotKeys);
    screenshots = screenshots.filter((item) => allowed.has(item.key));
  }
  const attachments: CommentAttachment[] = [];

  for (const item of screenshots) {
    const filename = item.key.split("/").pop();
    if (!filename) {
      continue;
    }

    const downloaded = await getEvidenceByKey(item.key);
    if (!downloaded) {
      continue;
    }

    if (env.githubUserSession) {
      try {
        const href = await uploadUserAttachment({
          octokit: params.octokit,
          owner: params.owner,
          repo: params.repo,
          filename,
          contentType: contentTypeForFilename(filename),
          body: downloaded.body,
        });

        attachments.push({
          order: 1,
          markdown: imageAttachmentMarkdown(item.label ?? "screenshot", href),
        });
        continue;
      } catch {
        // Fall through to repo upload.
      }
    }

    const path = evidenceRepoPath(params.prNumber, params.runId, filename);

    try {
      await ensureEvidenceBranch(params.octokit, params.owner, params.repo);
      const imageUrl = await uploadRepoFile({
        octokit: params.octokit,
        owner: params.owner,
        repo: params.repo,
        path,
        body: downloaded.body,
        message: `chore(qa): attach evidence for run ${params.runId}`,
      });

      attachments.push({
        order: 1,
        markdown: imageAttachmentMarkdown(item.label ?? "screenshot", imageUrl),
      });
    } catch {
      if (item.url) {
        attachments.push({
          order: 1,
          markdown: imageAttachmentMarkdown(item.label ?? "screenshot", item.url),
        });
      }
    }
  }

  return attachments;
}

async function buildGifVideoFallback(params: {
  evidence: EvidenceRef[];
  evidenceStore: EvidenceStore;
  reportUrl: string;
}): Promise<CommentAttachment | null> {
  const video = params.evidence.find(
    (item) => item.type === "video" && item.key.endsWith("session.mp4"),
  );
  if (!video) {
    return null;
  }

  const downloaded = await getEvidenceByKey(video.key);
  if (!downloaded) {
    return null;
  }

  try {
    const gif = await transcodeMp4ToGif(downloaded.body);
    const uploaded = await params.evidenceStore.upload({
      filename: "session.gif",
      body: gif,
      contentType: "image/gif",
      type: "screenshot",
      label: "QA session recording",
      public: true,
    });

    if (!uploaded.url) {
      return null;
    }

    return {
      order: 0,
      markdown: linkedImageMarkdown(
        "QA session recording",
        uploaded.url,
        params.reportUrl,
      ),
    };
  } catch {
    return null;
  }
}

export async function buildCommentAttachments(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  runId: string;
  reportUrl: string;
  evidence: EvidenceRef[];
  evidenceStore: EvidenceStore;
  selectedScreenshotKeys?: string[];
  posterScreenshotKey?: string;
  showSessionPreview?: boolean;
}): Promise<CommentAttachment[]> {
  const attachments: CommentAttachment[] = [];

  const screenshotKeys = params.selectedScreenshotKeys ?? [];
  const extraScreenshotKeys =
    params.posterScreenshotKey
      ? screenshotKeys.filter((key) => key !== params.posterScreenshotKey)
      : screenshotKeys;

  if (params.showSessionPreview !== false) {
    const video =
      (await uploadNativeGithubVideo(params)) ??
      (await uploadSessionPreview({
        ...params,
        posterScreenshotKey: params.posterScreenshotKey,
      })) ??
      (await buildGifVideoFallback({
        evidence: params.evidence,
        evidenceStore: params.evidenceStore,
        reportUrl: `${params.reportUrl}#session`,
      }));

    if (video) {
      attachments.push(video);
    }
  }

  attachments.push(
    ...(await uploadScreenshotAttachments({
      octokit: params.octokit,
      owner: params.owner,
      repo: params.repo,
      prNumber: params.prNumber,
      runId: params.runId,
      evidence: params.evidence,
      selectedScreenshotKeys: extraScreenshotKeys,
    })),
  );

  return attachments.sort((a, b) => a.order - b.order);
}

export function buildReportUrl(runId: string): string {
  return `${env.publicBaseUrl.replace(/\/$/, "")}/reports/${runId}`;
}
