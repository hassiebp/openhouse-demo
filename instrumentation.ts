import { registerTelemetry } from "ai";

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

let telemetryRegistered = false;
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

export function register() {
  if (telemetryRegistered) return;

  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();

  registerTelemetry(new LangfuseVercelAiSdkIntegration());

  telemetryRegistered = true;
}
