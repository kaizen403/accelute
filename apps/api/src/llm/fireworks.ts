import { ChatOpenAI } from "@langchain/openai";

import { env, isFireworksConfigured } from "../config.js";

export function createFireworksModel(temperature = 0.2): ChatOpenAI {
  if (!isFireworksConfigured()) {
    throw new Error("FIREWORKS_API_KEY is not configured");
  }

  return new ChatOpenAI({
    model: env.fireworksModel,
    temperature,
    apiKey: env.fireworksApiKey,
    configuration: {
      baseURL: "https://api.fireworks.ai/inference/v1",
    },
  });
}
