import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { BrowserContext, Locator, Page } from "playwright";
import { chromium } from "playwright";

import type { QaStepTarget } from "@accelute/shared";

import type {
  BrowserBackend,
  BrowserSession,
  ConsoleEntry,
  NetworkError,
  ScreenshotResult,
} from "./types.js";

function resolveLocator(page: Page, target: QaStepTarget): Locator {
  if (target.selector) {
    return page.locator(target.selector);
  }

  if (target.role && target.name) {
    return page.getByRole(target.role as Parameters<Page["getByRole"]>[0], {
      name: target.name,
    });
  }

  if (target.role) {
    return page.getByRole(target.role as Parameters<Page["getByRole"]>[0]);
  }

  if (target.label) {
    return page.getByLabel(target.label);
  }

  if (target.text) {
    return page.getByText(target.text);
  }

  if (target.name) {
    return page.getByText(target.name);
  }

  throw new Error(
    `Could not resolve locator from target: ${JSON.stringify(target)}`,
  );
}

class PlaywrightSession implements BrowserSession {
  private consoleEntries: ConsoleEntry[] = [];
  private networkErrors: NetworkError[] = [];
  private traceStarted = false;
  private artifactsDir: string;

  constructor(
    private readonly page: Page,
    private readonly context: BrowserContext,
    artifactsDir: string,
  ) {
    this.artifactsDir = artifactsDir;

    page.on("console", (msg) => {
      this.consoleEntries.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    page.on("pageerror", (error) => {
      this.consoleEntries.push({
        type: "error",
        text: error.message,
        timestamp: Date.now(),
      });
    });

    page.on("requestfailed", (request) => {
      this.networkErrors.push({
        url: request.url(),
        method: request.method(),
        failureText: request.failure()?.errorText,
      });
    });
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await this.page.waitForTimeout(500);
  }

  async click(target: QaStepTarget): Promise<void> {
    const locator = resolveLocator(this.page, target);
    await locator.first().click({ timeout: 15000 });
  }

  async type(target: QaStepTarget, value: string): Promise<void> {
    const locator = resolveLocator(this.page, target);
    await locator.first().fill(value, { timeout: 15000 });
  }

  async selectOption(target: QaStepTarget, value: string): Promise<void> {
    const locator = resolveLocator(this.page, target);
    await locator.first().selectOption(value, { timeout: 15000 });
  }

  async assertVisible(target: QaStepTarget): Promise<boolean> {
    try {
      const locator = resolveLocator(this.page, target);
      return await locator.first().isVisible({ timeout: 10000 });
    } catch {
      return false;
    }
  }

  async assertText(target: QaStepTarget, expected: string): Promise<boolean> {
    try {
      const locator = resolveLocator(this.page, target);
      const text = await locator.first().innerText({ timeout: 10000 });
      return text.includes(expected);
    } catch {
      return false;
    }
  }

  async readVisibleText(): Promise<string> {
    return this.page.locator("body").innerText();
  }

  async snapshot(): Promise<string> {
    return this.page.locator("body").innerHTML();
  }

  async screenshot(label: string): Promise<ScreenshotResult> {
    const buffer = await this.page.screenshot({ fullPage: true });
    return { buffer, label };
  }

  async scroll(): Promise<void> {
    await this.page.mouse.wheel(0, 600);
    await this.page.waitForTimeout(300);
  }

  async wait(ms = 1000): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  getConsoleErrors(): ConsoleEntry[] {
    return this.consoleEntries.filter(
      (entry) => entry.type === "error" || entry.type === "warning",
    );
  }

  getNetworkErrors(): NetworkError[] {
    return this.networkErrors;
  }

  async startTrace(): Promise<void> {
    if (!this.traceStarted) {
      await this.context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      this.traceStarted = true;
    }
  }

  async stopTrace(): Promise<Buffer | null> {
    if (!this.traceStarted) return null;

    const tracePath = join(this.artifactsDir, "trace.zip");
    await this.context.tracing.stop({ path: tracePath });
    const { readFile } = await import("node:fs/promises");
    return readFile(tracePath);
  }

  async stopVideo(): Promise<Buffer | null> {
    const video = this.page.video();
    if (!video) return null;

    const videoPath = await video.path();
    await this.page.close();
    const { readFile } = await import("node:fs/promises");
    return readFile(videoPath);
  }

  async close(): Promise<void> {
    if (!this.page.isClosed()) {
      await this.page.close();
    }
    await this.context.close();
  }
}

export class PlaywrightBackend implements BrowserBackend {
  async createSession(
    previewUrl: string,
    artifactsDir: string,
  ): Promise<BrowserSession> {
    await mkdir(artifactsDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      recordVideo: {
        dir: artifactsDir,
        size: { width: 1280, height: 720 },
      },
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    const session = new PlaywrightSession(page, context, artifactsDir);
    await session.startTrace();
    await session.goto(previewUrl);

    return session;
  }
}
