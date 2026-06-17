import { env } from "../config.js";
import { CamofoxBackend } from "./camofox.js";
import { PlaywrightBackend } from "./playwright.js";
import type { BrowserBackend } from "./types.js";

export function getBrowserBackend(): BrowserBackend {
  if (env.browserBackend === "camofox") {
    return new CamofoxBackend();
  }

  return new PlaywrightBackend();
}

export * from "./types.js";
