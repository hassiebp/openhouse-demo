import { registerTelemetry } from "ai";
import { registerOTel } from "@vercel/otel";

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";

export function register() {
  registerOTel({
    serviceName: "your-project-name",
    spanProcessors: [new LangfuseSpanProcessor()],
  });

  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
