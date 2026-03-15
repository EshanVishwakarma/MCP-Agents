import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  if (!patientId) {
    return NextResponse.json(
      { error: "Missing patientId" },
      { status: 400 }
    );
  }
  try {
    const session = await composio.create(patientId, {
      manageConnections: false,
    });
    const { items } = await session.toolkits();
    const toolkits = items.map((t) => ({
      slug: t.slug,
      name: t.name,
      connected: t.connection?.isActive ?? false,
    }));
    return NextResponse.json({ toolkits });
  } catch (err) {
    console.error("[GET /api/connect/.../status]", err);
    return NextResponse.json(
      { error: "Failed to load connection status" },
      { status: 500 }
    );
  }
}
