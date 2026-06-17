import cors from "cors";
import express, { type Express } from "express";

import { env } from "./config.js";
import { createGithubWebhooks } from "./github/webhooks.js";
import { evidenceRouter, runsRouter } from "./routes/runs.js";
import { devRouter } from "./routes/dev.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());

  const webhooks = createGithubWebhooks();

  app.post(
    "/webhooks/github",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["x-hub-signature-256"];
      const id = req.headers["x-github-delivery"];
      const name = req.headers["x-github-event"];

      if (
        typeof signature !== "string" ||
        typeof id !== "string" ||
        typeof name !== "string"
      ) {
        res.status(400).send("Missing webhook headers");
        return;
      }

      try {
        await webhooks.verifyAndReceive({
          id,
          name: name as Parameters<typeof webhooks.verifyAndReceive>[0]["name"],
          signature,
          payload: req.body,
        });

        res.status(202).json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Webhook error:", message);
        res.status(400).send(`Webhook Error: ${message}`);
      }
    },
  );

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "accelute-api" });
  });

  app.use("/runs", runsRouter);
  app.use("/evidence", evidenceRouter);
  app.use("/dev", devRouter);

  return app;
}

export function startServer() {
  const app = createApp();

  app.listen(env.apiPort, () => {
    console.log(`API listening on http://localhost:${env.apiPort}`);
  });
}

startServer();
