import "dotenv/config";

import {
  LangfuseClient,
  type Evaluator,
  type ExperimentTask,
} from "@langfuse/client";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { generateObject, registerTelemetry } from "ai";
import { z } from "zod";
import { generateAgentResponse, MODEL } from "../lib/agent";

type ItineraryExpectations = {
  mustInclude: string[];
  mustAvoid: string[];
};

const itineraryTask: ExperimentTask<string, ItineraryExpectations> = async ({
  input,
}) => {
  const result = await generateAgentResponse([
    {
      role: "user",
      content: input as string,
    },
  ]);

  return result.text;
};

const feasibilityAndPacingEvaluator: Evaluator<
  string,
  ItineraryExpectations
> = async ({ input, output, expectedOutput }) => {
  const prompt = `Score this itinerary from 0 to 1 for feasibility and pacing.
      Judge only whether the plan is realistic, appropriately paced, and respects the user's constraints.
      Penalize overpacked schedules, implausible routing, missed mobility/budget/time constraints, and vague logistics.

      User request:
      ${input}

      Expected constraints:
      ${JSON.stringify(expectedOutput, null, 2)}

      Itinerary:
      ${outputText(output)}

      Return JSON with:
      - score: number from 0 to 1
      - reasoning: one concise sentence explaining the score`;

  const result = await generateObject({
    model: MODEL,
    schema: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
    schemaName: "FeasibilityAndPacingScore",
    prompt,
  });

  return {
    name: "feasibility_and_pacing",
    value: result.object.score,
    comment: result.object.reasoning,
    metadata: {
      evaluatorModel: MODEL,
    },
  };
};

async function main() {
  const telemetry = registerExperimentTelemetry();
  const langfuse = new LangfuseClient();

  const dataset = langfuse.dataset.get("itinerary-prompts");

  try {
    const result = await (
      await dataset
    ).runExperiment({
      name: "openhouse-itinerary-agent-demo",
      metadata: {
        app: "openhouse-demo",
        agentModel: MODEL,
      },
      task: itineraryTask,
      evaluators: [feasibilityAndPacingEvaluator],
    });

    console.log(await result.format({ includeItemResults: true }));
  } finally {
    await Promise.allSettled([
      langfuse.shutdown(),
      telemetry.tracerProvider.shutdown(),
    ]);
  }
}

function registerExperimentTelemetry() {
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [new LangfuseSpanProcessor()],
  });

  tracerProvider.register();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());

  return { tracerProvider };
}

function outputText(output: unknown) {
  return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
