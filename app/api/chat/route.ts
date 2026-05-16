import { streamAgentResponse } from "@/lib/agent";
import { convertToModelMessages, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const result = await streamAgentResponse(await convertToModelMessages(messages));

  return result.toUIMessageStreamResponse();
}
