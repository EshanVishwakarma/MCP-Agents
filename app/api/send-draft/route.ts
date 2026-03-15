import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

export async function POST(req: Request) {
  try {
    const { patientId, draftId } = (await req.json()) as {
      patientId?: string;
      draftId?: string;
    };
    if (!patientId || !draftId) {
      return NextResponse.json(
        { error: "patientId and draftId required" },
        { status: 400 }
      );
    }

    const session = await composio.create(patientId, {
      manageConnections: false,
      toolkits: ["gmail", "googlecalendar"],
    });
    await session.execute("GMAIL_SEND_DRAFT", {
      draft_id: draftId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-draft]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to send draft",
      },
      { status: 500 }
    );
  }
}
