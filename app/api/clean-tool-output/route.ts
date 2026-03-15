import { google } from "@ai-sdk/google";
import { generateText, generateObject, zodSchema } from "ai";
import { z } from "zod";

function isEmailTool(toolName: string): boolean {
  const n = toolName.toUpperCase();
  return n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET");
}

const META_TOOLS = ["COMPOSIO_SEARCH_TOOLS", "COMPOSIO_MULTI_EXECUTE_TOOL", "COMPOSIO_REMOTE_WORKBENCH"];
function isMetaTool(toolName: string): boolean {
  return META_TOOLS.includes(toolName.toUpperCase());
}

/** Detect if output looks like email list (messages/emails with subject/from/snippet). */
function looksLikeEmailOutput(output: unknown): boolean {
  if (output == null || typeof output !== "object") return false;
  const str = JSON.stringify(output);
  if (/"messages"\s*:\s*\[|"emails"\s*:\s*\[/.test(str) && /"subject"|"from"|"snippet"|"body"/i.test(str)) return true;
  const o = output as Record<string, unknown>;
  const results = o.results ?? (o.data as Record<string, unknown>)?.results;
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as Record<string, unknown>;
    const out = first.output ?? first.data ?? first.result;
    if (out != null && looksLikeEmailOutput(out)) return true;
  }
  return false;
}

/** Check if an array looks like calendar events (has start/end/summary). */
function isCalendarEventArray(arr: unknown): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  if (first == null || typeof first !== "object") return false;
  const keys = Object.keys(first as Record<string, unknown>);
  const hasTime = keys.some((k) => /^start$|^end$|dateTime|date/i.test(k));
  const hasSummary = keys.some((k) => /^summary$|description|location/i.test(k));
  return hasTime && hasSummary;
}

/** Detect if output looks like Google Calendar data (events/items with start/end/summary). */
function looksLikeCalendarOutput(output: unknown): boolean {
  if (output == null || typeof output !== "object") return false;
  const o = output as Record<string, unknown>;
  const data = o.data ?? o.body ?? o;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (isCalendarEventArray(d.items) || isCalendarEventArray(d.events)) return true;
  }
  if (isCalendarEventArray(o.items) || isCalendarEventArray(o.events)) return true;
  const results = o.results ?? (o.data as Record<string, unknown>)?.results ?? o.output;
  const arr = Array.isArray(results) ? results : undefined;
  if (arr && arr.length > 0) {
    for (const item of arr) {
      if (item != null && typeof item === "object" && looksLikeCalendarOutput(item)) return true;
      const rec = item as Record<string, unknown>;
      const out = rec?.output ?? rec?.data ?? rec?.result;
      if (out != null && looksLikeCalendarOutput(out)) return true;
    }
  }
  const str = typeof output === "string" ? output : JSON.stringify(output);
  if (str.length > 100000) return false;
  const hasCalendarStructure = /"items"\s*:\s*\[|"events"\s*:\s*\[/.test(str);
  const hasCalendarContent = /"summary"|"start"|"end"|"dateTime"|"date"|calendar#event|google\.com.*calendar/i.test(str);
  const hasEmailList = /"messages"\s*:\s*\[|"emails"\s*:\s*\[/.test(str) && /"subject"|"from"|"snippet"/i.test(str);
  if (hasCalendarStructure && hasCalendarContent && !hasEmailList) return true;
  if (/calendar|GOOGLECALENDAR|list.*event/i.test(str) && hasCalendarContent && !hasEmailList) return true;
  return false;
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

const CALENDAR_SUMMARY_PROMPT = `You are helping a care coordinator view a patient's calendar. The following tool output contains Google Calendar event data (often under items[], or nested in results[0].output.data). Extract each event and list them clearly.

For each event include: title (summary), date and time (from start/end), and location if present. Use bullet points or numbered list. Be concise. If there are no events, say "No upcoming events" or "No events in this range." Do not mention emails or email lists—this is calendar data only.`;

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

    const isCalendar = looksLikeCalendarOutput(output);
    const useEmailStructure =
      (isEmailTool(toolName) || (isMetaTool(toolName) && looksLikeEmailOutput(output))) && !isCalendar;
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

    const summaryPrompt = isCalendar ? CALENDAR_SUMMARY_PROMPT : CLEAN_PROMPT;
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: summaryPrompt,
      prompt: `Tool: ${toolName}\n\nRaw output:\n${JSON.stringify(output, null, 2)}`,
    });

    return new Response(JSON.stringify({ summary: text || (isCalendar ? "No events found." : "No summary."), emails: [] }), {
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
