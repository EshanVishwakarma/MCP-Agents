import { google } from "@ai-sdk/google";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { generateText, stepCountIs } from "ai";
import { getAllFlows } from "@/lib/store";
import type { FlowSchedule } from "@/lib/store";

const composio = new Composio({ provider: new VercelProvider() });

const SCHEDULE_HOURS: Record<FlowSchedule, number> = {
  morning: 8,
  evening: 18,
  daily: 9,
};

function getDueSchedules(): FlowSchedule[] {
  const hour = new Date().getHours();
  const due: FlowSchedule[] = [];
  if (hour === SCHEDULE_HOURS.morning) due.push("morning");
  if (hour === SCHEDULE_HOURS.evening) due.push("evening");
  if (hour === SCHEDULE_HOURS.daily) due.push("daily");
  return due;
}

const FLOW_SYSTEM_PROMPT = `You are an automated healthcare flow running on behalf of a care team. You have access to the patient's connected tools (calendar, email, etc.). Your job is to execute the given flow instructions exactly. Do not ask for confirmation. Use the tools to complete the task. Be concise. If you send an email to the patient, summarize what you did at the end.`;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || process.env.FLOWS_CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const due = getDueSchedules();
  if (due.length === 0) {
    return Response.json({
      ok: true,
      message: "No flows due at this hour",
      due: [],
    });
  }

  const allFlows = getAllFlows();
  const toRun = allFlows.filter(
    (f) => f.enabled && due.includes(f.schedule)
  );

  const results: { flowId: string; patientId: string; ok: boolean; error?: string }[] = [];

  for (const flow of toRun) {
    try {
      const session = await composio.create(flow.patientId, {
        manageConnections: false,
      });
      const tools = await session.tools();

      await generateText({
        model: google("gemini-2.5-flash"),
        system: FLOW_SYSTEM_PROMPT,
        prompt: `Execute this flow now:\n\n${flow.instructions}`,
        tools,
        stopWhen: stepCountIs(10),
      });

      results.push({ flowId: flow.id, patientId: flow.patientId, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[run-flows]", flow.id, message);
      results.push({
        flowId: flow.id,
        patientId: flow.patientId,
        ok: false,
        error: message,
      });
    }
  }

  return Response.json({
    ok: true,
    ran: results.length,
    results,
  });
}
