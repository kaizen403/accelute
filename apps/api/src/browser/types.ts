import type { QaStep, QaStepTarget } from "@accelute/shared";

export interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
}

export interface NetworkError {
  url: string;
  method: string;
  failureText?: string;
}

export interface ScreenshotResult {
  buffer: Buffer;
  label: string;
}

export interface BrowserSession {
  goto(url: string): Promise<void>;
  click(target: QaStepTarget): Promise<void>;
  type(target: QaStepTarget, value: string): Promise<void>;
  selectOption(target: QaStepTarget, value: string): Promise<void>;
  assertVisible(target: QaStepTarget): Promise<boolean>;
  assertText(target: QaStepTarget, expected: string): Promise<boolean>;
  readVisibleText(): Promise<string>;
  snapshot(): Promise<string>;
  screenshot(label: string): Promise<ScreenshotResult>;
  scroll(): Promise<void>;
  wait(ms?: number): Promise<void>;
  getConsoleErrors(): ConsoleEntry[];
  getNetworkErrors(): NetworkError[];
  startTrace(): Promise<void>;
  stopTrace(): Promise<Buffer | null>;
  stopVideo(): Promise<Buffer | null>;
  close(): Promise<void>;
}

export interface BrowserBackend {
  createSession(previewUrl: string, artifactsDir: string): Promise<BrowserSession>;
}

export interface BrowserFactoryOptions {
  backend: "playwright" | "camofox";
  camofoxUrl?: string;
}
