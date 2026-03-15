import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

const ACTION_TOOL: Record<string, string> = {
  create: "GOOGLECALENDAR_CREATE_EVENT",
  update: "GOOGLECALENDAR_UPDATE_EVENT",
  patch: "GOOGLECALENDAR_PATCH_EVENT",
  delete: "GOOGLECALENDAR_DELETE_EVENT",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      patientId?: string;
      action?: string;
      [key: string]: unknown;
    };
    const { patientId, action, ...params } = body;
    if (!patientId || !action) {
      return NextResponse.json(
        { error: "patientId and action required" },
        { status: 400 }
      );
    }
    const toolSlug = ACTION_TOOL[action.toLowerCase()];
    if (!toolSlug) {
      return NextResponse.json(
        { error: "action must be create, update, patch, or delete" },
        { status: 400 }
      );
    }

    const session = await composio.create(patientId, {
      manageConnections: false,
    });
    await session.execute(toolSlug, params as Record<string, unknown>);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[execute-calendar-action]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to execute calendar action",
      },
      { status: 500 }
    );
  }
}
