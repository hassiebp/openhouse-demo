import { streamAgentResponse } from "@/lib/agent";
import { convertToModelMessages, type UIMessage } from "ai";
import { trace } from "@opentelemetry/api";
import {
  observe,
  propagateAttributes,
  setActiveTraceIO,
} from "@langfuse/tracing";

export const maxDuration = 30;
export const runtime = "nodejs";

function getLatestUserText(messages: UIMessage[]) {
  return messages
    .at(-1)
    ?.parts.map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

async function handler(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  setActiveTraceIO({
    input: getLatestUserText(messages),
  });

  return propagateAttributes(
    {
      traceName: "OpenHouse-Itinerary-Agent",
      metadata: {
        messageCount: String(messages.length),
      },
    },
    async () => {
      const result = await streamAgentResponse(
        await convertToModelMessages(messages),
        (event) => {
          setActiveTraceIO({
            output: event.text,
          });
          trace.getActiveSpan()?.end();
        },
      );

      return result.toUIMessageStreamResponse();
    },
  );
}

export const POST = observe(handler, {
  name: "OpenHouse-Itinerary-Agent",
  endOnExit: false,
});
