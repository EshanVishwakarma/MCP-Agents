import { google } from "@ai-sdk/google";
import { generateText, generateObject, zodSchema } from "ai";
import { z } from "zod";

function isEmailTool(toolName: string): boolean {
  const n = toolName.toUpperCase();
  return n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET");
}

/** Extract email-like payload from Composio meta tool output (e.g. COMPOSIO_MULTI_EXECUTE_TOOL). */
function extractEmailPayload(output: unknown): unknown {
  if (output == null) return output;
  const o = output as Record<string, unknown>;
  // Direct Gmail-style container
  const payload = o.data ?? o.body ?? o;
  if (payload && typeof payload === "object") {
    const d = payload as Record<string, unknown>;
    if (Array.isArray(d.messages)) return d;
    if (Array.isArray(d.emails)) return d;
    if (Array.isArray(d.items)) return d;
  }
  // results[].output from multi-execute / tool router
  const results = o.results ?? (o.data as Record<string, unknown>)?.results ?? o.output;
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as Record<string, unknown>;
    const out = first.output ?? first.data ?? first.result ?? first.body ?? first;
    if (out != null && typeof out === "object") {
      const inner = extractEmailPayload(out);
      const innerObj = inner as Record<string, unknown>;
      if (
        (typeof inner === "object" && inner !== null &&
          (Array.isArray(innerObj.messages) || Array.isArray(innerObj.emails) || Array.isArray(innerObj.items))) ||
        (inner !== out && inner !== output)
      ) {
        return inner;
      }
    }
    return extractEmailPayload(first);
  }
  if (typeof o.data === "object" && o.data !== null) return extractEmailPayload(o.data);
  if (typeof o.output === "object" && o.output !== null) return extractEmailPayload(o.output);
  return output;
}

const CLEAN_PROMPT = `You are helping a care coordinator view patient data. Format the following tool output into a brief, clear summary.

Rules:
- Be concise. Use bullet points and plain language.
- For emails: include sender, date, subject, and a one-line summary of content where helpful.
- For calendar events: include event title, date/time, and location when available.
- Do not add medical advice or interpret clinical content.
- If the data is empty or an error, say so plainly.`;

const EMAIL_STRUCTURED_PROMPT = `You are helping a care coordinator view a patient's emails. From the raw tool output, extract each email (or thread) as a separate item.

The output may be nested (e.g. inside results[0].output.data.messages, or data.messages, or similar). Look through the entire JSON for any array of email-like objects (with subject, from/sender, snippet, date, or body). Extract from wherever you find that list.

For each email provide:
- category: optional short label (e.g. "Newsletter", "Medical", "Personal", "Promotions") to help prioritize.
- sender: who sent it (name or email).
- subject: the subject line.
- date: when it was sent if available.
- snippet: one short line summarizing the content or purpose (optional).

Also provide a brief summary string (1–2 sentences) describing the set of emails overall.
If you truly find no email list anywhere in the output, return an empty emails array and a summary that says so.`;

const emailListSchema = z.object({
  summary: z.string().describe("Brief overall summary of the emails"),
  emails: z.array(
    z.object({
      category: z.string().optional().describe("Short category label e.g. Newsletter, Medical"),
      sender: z.string().describe("Sender name or email"),
      subject: z.string().describe("Email subject line"),
      date: z.string().optional().describe("Date or relative time"),
      snippet: z.string().optional().describe("One-line summary of content"),
    })
  ),
});

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

    const useEmailStructure = isEmailTool(toolName);
    const payload = useEmailStructure ? extractEmailPayload(output) : output;
    const payloadHasEmailList =
      payload &&
      typeof payload === "object" &&
      (Array.isArray((payload as Record<string, unknown>).messages) ||
        Array.isArray((payload as Record<string, unknown>).emails) ||
        Array.isArray((payload as Record<string, unknown>).items));

    if (useEmailStructure) {
      // If extraction didn't find a messages/emails/items array, pass full raw output so the model can find emails in nested metadata.
      const promptPayload = payloadHasEmailList ? payload : output;
      const { object } = await generateObject({
        model: google("gemini-2.5-flash"),
        system: EMAIL_STRUCTURED_PROMPT,
        prompt: `Tool: ${toolName}\n\nRaw output:\n${JSON.stringify(promptPayload, null, 2)}`,
        schema: zodSchema(emailListSchema),
      });
      return new Response(
        JSON.stringify({ summary: object.summary, emails: object.emails ?? [] }),
        { headers: { "Content-Type": "application/json" } }
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
