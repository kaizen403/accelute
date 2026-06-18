import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@accelute/db";
import type { EvidenceRef } from "@accelute/shared";

import { env, isR2Configured } from "../config.js";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!isR2Configured()) {
      throw new Error("R2 is not configured");
    }

    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }

  return s3Client;
}

export class EvidenceStore {
  constructor(private readonly runId: string, private readonly prNumber: number) {}

  private buildKey(filename: string): string {
    return `pr-${this.prNumber}/${this.runId}/${filename}`;
  }

  getPublicUrl(key: string): string | undefined {
    if (!env.r2PublicBaseUrl) {
      return undefined;
    }

    return `${env.r2PublicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  private isPublicVideoKey(key: string): boolean {
    return key.endsWith("session.mp4") && Boolean(env.r2PublicBaseUrl);
  }

  async upload(params: {
    filename: string;
    body: Buffer | string;
    contentType: string;
    type: EvidenceRef["type"];
    stepId?: string;
    label?: string;
    public?: boolean;
  }): Promise<EvidenceRef> {
    const key = this.buildKey(params.filename);

    if (isR2Configured()) {
      const client = getS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: env.r2Bucket,
          Key: key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
    }

    const evidence = await prisma.evidence.create({
      data: {
        runId: this.runId,
        stepId: params.stepId,
        type: params.type,
        r2Key: key,
        contentType: params.contentType,
        label: params.label,
      },
    });

    const url = params.public
      ? this.getPublicUrl(key)
      : await this.getPresignedUrl(key);

    return {
      type: params.type,
      key: evidence.r2Key,
      url,
      label: params.label,
    };
  }

  async getPresignedUrl(key: string): Promise<string | undefined> {
    if (!isR2Configured()) {
      return `${env.publicBaseUrl}/evidence/${encodeURIComponent(key)}`;
    }

    const client = getS3Client();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: env.r2Bucket,
        Key: key,
      }),
      { expiresIn: 60 * 60 * 24 },
    );
  }

  async listForRun(): Promise<EvidenceRef[]> {
    const rows = await prisma.evidence.findMany({
      where: { runId: this.runId },
      orderBy: { createdAt: "asc" },
    });

    return Promise.all(
      rows.map(async (row) => ({
        type: row.type as EvidenceRef["type"],
        key: row.r2Key,
        url: this.isPublicVideoKey(row.r2Key)
          ? this.getPublicUrl(row.r2Key)
          : await this.getPresignedUrl(row.r2Key),
        label: row.label ?? undefined,
      })),
    );
  }
}

export async function getEvidenceByKey(key: string): Promise<{
  body: Buffer;
  contentType?: string;
} | null> {
  if (!isR2Configured()) {
    return null;
  }

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
    }),
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) return null;

  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType,
  };
}
