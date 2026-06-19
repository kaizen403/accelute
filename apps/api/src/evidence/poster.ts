import type { EvidenceRef, StepResult } from "@accelute/shared";
import sharp from "sharp";

export function pickPosterScreenshotKey(params: {
  evidence: EvidenceRef[];
  stepResults: StepResult[];
  highlightStepId?: string;
  commentScreenshotKeys?: string[];
}): string | null {
  if (params.highlightStepId) {
    const step = params.stepResults.find(
      (item) => item.stepId === params.highlightStepId,
    );
    const shot = step?.evidence.find((item) => item.type === "screenshot");
    if (shot?.key) {
      return shot.key;
    }
  }

  const curated = params.commentScreenshotKeys?.[0];
  if (curated) {
    return curated;
  }

  const navigateStep = params.stepResults.find(
    (item) => item.action === "navigate",
  );
  const navigateShot = navigateStep?.evidence.find(
    (item) => item.type === "screenshot",
  );
  if (navigateShot?.key) {
    return navigateShot.key;
  }

  const anyShot = params.evidence.find((item) => item.type === "screenshot");
  return anyShot?.key ?? null;
}

function playButtonSvg(width: number, height: number): string {
  const radius = Math.round(Math.min(width, height) * 0.09);
  const cx = width / 2;
  const cy = height / 2;
  const triangle = [
    [cx - radius * 0.35, cy - radius * 0.55],
    [cx - radius * 0.35, cy + radius * 0.55],
    [cx + radius * 0.65, cy],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
  <polygon points="${triangle}" fill="rgba(255,255,255,0.95)"/>
</svg>`;
}

export async function buildPlayButtonPoster(screenshot: Buffer): Promise<Buffer> {
  const resized = await sharp(screenshot)
    .resize(960, null, { withoutEnlargement: true, fit: "inside" })
    .jpeg({ quality: 90 })
    .toBuffer();

  const metadata = await sharp(resized).metadata();
  const width = metadata.width ?? 960;
  const height = metadata.height ?? 540;

  return sharp(resized)
    .composite([
      {
        input: Buffer.from(playButtonSvg(width, height)),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}
