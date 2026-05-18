import { registerTelemetry } from "ai";
import { OpenTelemetry } from "@ai-sdk/otel";
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
    registerTelemetry(new OpenTelemetry());
    telemetryRegistered = true;
  }
}
