import { ToolLoopAgent, type ModelMessage } from "ai";
import { itineraryTools } from "./tools/itinerary-tools";

export const MODEL = "openai/gpt-5.4-mini";
// export const MODEL = "anthropic/claude-sonnet-4.5";

const agent = new ToolLoopAgent({
  id: "itinerary-planner-orchestrator",
  model: MODEL,
  instructions:
    "You are an itinerary-planning orchestrator for the ClickHouse Open House Conference demo. Help users plan trips with practical, concise recommendations. Use the specialist tools to research destinations, draft day plans, estimate budgets, and check logistics before presenting an itinerary. Ask a brief clarifying question only when a missing detail would materially change the plan.",
  tools: itineraryTools,
  include: {
    responseBody: true,
  },
});

type AgentOnFinish = Parameters<typeof agent.stream>[0]["onFinish"];

export function generateAgentResponse(messages: ModelMessage[]) {
  return agent.generate({ messages });
}

export function streamAgentResponse(
  messages: ModelMessage[],
  onFinish?: AgentOnFinish,
) {
  return agent.stream({
    messages,
    onFinish: (event) => {
      console.dir(
        event.steps.map((step) => ({
          stepNumber: step.stepNumber,
          response: step.response,
          toolCalls: step.toolCalls,
          toolResults: step.toolResults,
        })),
        { depth: null },
      );
      onFinish?.(event);
    },
  });
}
