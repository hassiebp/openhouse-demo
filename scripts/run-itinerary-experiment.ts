import "dotenv/config";

import {
  LangfuseClient,
  type Evaluator,
  type ExperimentItem,
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

const EXPERIMENT_NAME = "openhouse-itinerary-agent-demo";

const data: ExperimentItem<string, ItineraryExpectations>[] = [
  {
    input:
      "I am at a conference near Moscone Center in San Francisco. Give me an evening-only itinerary after 5pm with dinner and one memorable stop.",
    expectedOutput: {
      mustInclude: ["after 5pm", "dinner", "near Moscone Center"],
      mustAvoid: ["full-day itinerary", "early morning plan"],
    },
  },
  {
    input:
      "Plan a relaxed 2-day Tokyo itinerary for two first-time visitors who love food and want to avoid long transit hops.",
    expectedOutput: {
      mustInclude: ["food", "relaxed pacing", "short transit hops"],
      mustAvoid: ["overloaded schedule", "cross-city backtracking"],
    },
  },
  {
    input:
      "Create a 3-day Paris plan for my parents. They have limited mobility, prefer taxis or short walks, and want classic sights without feeling rushed.",
    expectedOutput: {
      mustInclude: [
        "limited mobility",
        "short walks or taxis",
        "classic sights",
      ],
      mustAvoid: ["long walking route", "packed museum day"],
    },
  },
];

const itineraryTask: ExperimentTask<string, ItineraryExpectations> = async ({
  input,
}) => {
  const result = await generateAgentResponse([
    {
      role: "user",
      content: requireString(input),
    },
  ]);

  return result.text;
};

const feasibilityAndPacingEvaluator: Evaluator<
  string,
  ItineraryExpectations
> = async ({ input, output, expectedOutput }) => {
  const result = await generateObject({
    model: MODEL,
    schema: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
    schemaName: "FeasibilityAndPacingScore",
    maxOutputTokens: 300,
    prompt: `Score this itinerary from 0 to 1 for feasibility and pacing.

Judge only whether the plan is realistic, appropriately paced, and respects the user's constraints.
Penalize overpacked schedules, implausible routing, missed mobility/budget/time constraints, and vague logistics.

User request:
${input}

Expected constraints:
${JSON.stringify(requireExpectedOutput(expectedOutput), null, 2)}

Itinerary:
${outputText(output)}

Return JSON with:
- score: number from 0 to 1
- reasoning: one concise sentence explaining the score`,
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
  validateLangfuseEnv();

  const telemetry = registerExperimentTelemetry();
  const langfuse = new LangfuseClient();

  try {
    const result = await langfuse.experiment.run({
      name: EXPERIMENT_NAME,
      metadata: {
        app: "openhouse-demo",
        agentModel: MODEL,
      },
      data,
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

function validateLangfuseEnv() {
  const missing = ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required Langfuse environment variables: ${missing.join(", ")}.`,
    );
  }
}

function requireString(input: unknown) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Experiment item is missing a string input.");
  }

  return input;
}

function requireExpectedOutput(
  expectedOutput: ItineraryExpectations | undefined,
) {
  if (!expectedOutput) {
    throw new Error("Experiment item is missing expectedOutput.");
  }

  return expectedOutput;
}

function outputText(output: unknown) {
  return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
