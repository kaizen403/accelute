import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { env } from "../config.js";

const require = createRequire(import.meta.url);
const ffmpegStaticPath = require("ffmpeg-static") as string | null;

async function resolveFfmpegPath(): Promise<string> {
  if (ffmpegStaticPath) {
    try {
      await access(ffmpegStaticPath);
      return ffmpegStaticPath;
    } catch {
      // Binary not downloaded (pnpm may block postinstall).
    }
  }

  return "ffmpeg";
}

function runFfmpeg(ffmpegPath: string, inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-filter:v",
      "setpts=PTS/2,fps=24,scale=960:-2",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      String(env.videoMaxSeconds),
      outputPath,
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

export async function transcodeWebmToMp4(webm: Buffer): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const inputPath = join(tmpdir(), `qa-webm-${id}.webm`);
  const outputPath = join(tmpdir(), `qa-mp4-${id}.mp4`);

  await writeFile(inputPath, webm);

  try {
    const ffmpegPath = await resolveFfmpegPath();
    await runFfmpeg(ffmpegPath, inputPath, outputPath);
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => undefined);
    await unlink(outputPath).catch(() => undefined);
  }
}
