import PQueue from "p-queue";

import { runQaPipeline } from "../pipeline/orchestrator.js";

const queue = new PQueue({ concurrency: 1 });

export function enqueueQaRun(runId: string): void {
  void queue.add(async () => {
    await runQaPipeline(runId);
  });
}

export function getQueueStats() {
  return {
    size: queue.size,
    pending: queue.pending,
  };
}
