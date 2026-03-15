import { google } from "@ai-sdk/google";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import {
  streamText,
  convertToModelMessages,
  generateId,
  stepCountIs,
  type UIMessage,
} from "ai";

const composio = new Composio({ provider: new VercelProvider() });

const NAVIGATOR_SYSTEM_PROMPT = `You are a healthcare navigation assistant for Arul Health. You are chatting with a navigator or care coordinator. The tools available are connected to the **patient's** accounts (Gmail, Google Calendar, etc.). Use them to act on the patient's behalf (e.g. check their calendar, send email from their account, create reminders) as requested by the navigator. Be clear about what you're doing and which account you're using. Never give medical advice or diagnose; encourage the care team to follow up with the patient's providers for clinical decisions.`;

export async function POST(req: Request) {
  try {
    const patientId =
      new URL(req.url).searchParams.get("patientId") ?? "user_123";
    const { messages }: { messages: UIMessage[] } = await req.json();

    const session = await composio.create(patientId, {
      manageConnections: false,
    });
    const tools = await session.tools();

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: NAVIGATOR_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () => generateId(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get response";
    console.error("[chat]", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
