import {
  jsonSchema,
  ToolLoopAgent,
  tool,
  type ModelMessage,
} from "ai";

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5.4-mini',
  instructions:
    "You are a helpful, concise assistant for the ClickHouse Open House Conference demo.",
  tools: {
    getCurrentTime: tool({
      description: "Get the current server time as an ISO timestamp.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => ({
        now: new Date().toISOString(),
      }),
    }),
  },
});

export function streamAgentResponse(messages: ModelMessage[]) {
  return agent.stream({
    messages,
  });
}
