import type { QaStepTarget } from "@accelute/shared";

import { env } from "../config.js";
import { PlaywrightBackend } from "./playwright.js";
import type {
  BrowserBackend,
  BrowserSession,
  ConsoleEntry,
  NetworkError,
  ScreenshotResult,
} from "./types.js";

class CamofoxSession implements BrowserSession {
  constructor(
    private readonly baseUrl: string,
    private readonly tabId: string,
  ) {}

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Camofox request failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async goto(url: string): Promise<void> {
    await this.request(`/tabs/${this.tabId}/navigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  async click(_target: QaStepTarget): Promise<void> {
    throw new Error("Camofox click by target is not implemented in MVP stub");
  }

  async type(_target: QaStepTarget, _value: string): Promise<void> {
    throw new Error("Camofox type is not implemented in MVP stub");
  }

  async selectOption(_target: QaStepTarget, _value: string): Promise<void> {
    throw new Error("Camofox select is not implemented in MVP stub");
  }

  async assertVisible(_target: QaStepTarget): Promise<boolean> {
    const snapshot = await this.snapshot();
    return snapshot.length > 0;
  }

  async assertText(_target: QaStepTarget, _expected: string): Promise<boolean> {
    const text = await this.readVisibleText();
    return text.includes(_expected);
  }

  async readVisibleText(): Promise<string> {
    const result = await this.request<{ snapshot?: string }>(
      `/tabs/${this.tabId}/snapshot`,
      { method: "POST" },
    );
    return result.snapshot ?? "";
  }

  async snapshot(): Promise<string> {
    const result = await this.request<{ snapshot?: string }>(
      `/tabs/${this.tabId}/snapshot`,
      { method: "POST" },
    );
    return result.snapshot ?? "";
  }

  async screenshot(label: string): Promise<ScreenshotResult> {
    const result = await this.request<{ screenshot?: string }>(
      `/tabs/${this.tabId}/screenshot`,
      { method: "POST" },
    );

    const base64 = result.screenshot ?? "";
    return {
      label,
      buffer: Buffer.from(base64, "base64"),
    };
  }

  async scroll(): Promise<void> {
    await this.request(`/tabs/${this.tabId}/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "down" }),
    });
  }

  async wait(ms = 1000): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConsoleErrors(): ConsoleEntry[] {
    return [];
  }

  getNetworkErrors(): NetworkError[] {
    return [];
  }

  async startTrace(): Promise<void> {
    // Camofox supports session tracing via its API; stub for MVP.
  }

  async stopTrace(): Promise<Buffer | null> {
    return null;
  }

  async stopVideo(): Promise<Buffer | null> {
    return null;
  }

  async close(): Promise<void> {
    await this.request(`/tabs/${this.tabId}`, { method: "DELETE" });
  }
}

export class CamofoxBackend implements BrowserBackend {
  constructor(private readonly baseUrl = env.camofoxUrl) {}

  async createSession(
    previewUrl: string,
    _artifactsDir: string,
  ): Promise<BrowserSession> {
    const response = await fetch(`${this.baseUrl}/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: previewUrl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Camofox tab: ${response.status}`);
    }

    const data = (await response.json()) as { tabId: string };
    return new CamofoxSession(this.baseUrl, data.tabId);
  }
}

export function createBrowserBackend(kind: "playwright" | "camofox"): BrowserBackend {
  if (kind === "camofox") {
    return new CamofoxBackend();
  }

  return new PlaywrightBackend();
}
