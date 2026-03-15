import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const CLEAN_PROMPT = `You are helping a care coordinator view patient data. Format the following tool output into a brief, clear summary.

Rules:
- Be concise. Use bullet points and plain language.
- For emails: include sender, date, subject, and a one-line summary of content where helpful.
- For calendar events: include event title, date/time, and location when available.
- Do not add medical advice or interpret clinical content.
- If the data is empty or an error, say so plainly.`;

export async function POST(req: Request) {
  try {
    const { toolName, output } = (await req.json()) as {
      toolName: string;
      output: unknown;
    };
    if (toolName == null || output === undefined) {
      return new Response(
        JSON.stringify({ error: "toolName and output required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: CLEAN_PROMPT,
      prompt: `Tool: ${toolName}\n\nRaw output:\n${JSON.stringify(output, null, 2)}`,
    });

    return new Response(JSON.stringify({ summary: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[clean-tool-output]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to clean output",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
