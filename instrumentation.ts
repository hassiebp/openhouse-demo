import { registerTelemetry } from "ai";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export const langfuseSpanProcessor = new LangfuseSpanProcessor();
let telemetryRegistered = false;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();

  if (!telemetryRegistered) {
    registerTelemetry(new LangfuseVercelAiSdkIntegration());
    telemetryRegistered = true;
  }
}
