import { registerTelemetry } from "ai";
import { registerOTel } from "@vercel/otel";

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";

export const langfuseSpanProcessor = new LangfuseSpanProcessor();

export function register() {
  registerOTel({
    serviceName: "openhouse-itinerary-agent",
    spanProcessors: [langfuseSpanProcessor],
  });

  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
