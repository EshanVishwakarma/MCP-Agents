import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const toolkit = new URL(req.url).searchParams.get("toolkit");
  if (!patientId || !toolkit) {
    return NextResponse.json(
      { error: "Missing patientId or toolkit" },
      { status: 400 }
    );
  }
  try {
    const session = await composio.create(patientId, {
      manageConnections: false,
      toolkits: ["gmail", "googlecalendar"],
    });
    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/connect/${patientId}/callback`;
    const connectionRequest = await session.authorize(toolkit, {
      callbackUrl,
    });
    const redirectUrl = connectionRequest.redirectUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl) {
      return NextResponse.json(
        { error: "No redirect URL from provider" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[GET /api/connect/.../authorize]", err);
    return NextResponse.json(
      { error: "Failed to start authorization" },
      { status: 500 }
    );
  }
}
