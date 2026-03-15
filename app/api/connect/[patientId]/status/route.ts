import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

const slugNorm = (s: string) => s.toLowerCase().replace(/_/g, "");

/** Resolve a human-readable label by calling the provider (Gmail / Google Calendar) so we show which account is connected. */
async function resolveAccountLabel(
  session: { execute: (slug: string, params: Record<string, unknown>) => Promise<unknown> },
  slug: string
): Promise<string | undefined> {
  const norm = slugNorm(slug);
  try {
    if (norm === "gmail") {
      const res = await session.execute("GMAIL_GET_PROFILE", {
        user_id: "me",
      });
      const d = (res as { data?: Record<string, unknown> })?.data;
      const email =
        (d?.emailAddress as string) ??
        (d?.email_address as string) ??
        (d?.email as string);
      if (typeof email === "string" && email.length > 0) return email;
    }
    if (norm === "googlecalendar") {
      const res = await session.execute("GOOGLECALENDAR_LIST_CALENDARS", {});
      const d = (res as { data?: { items?: Array<{ summary?: string; primary?: boolean; id?: string }> } })?.data;
      const items = d?.items;
      if (Array.isArray(items) && items.length > 0) {
        const primary = items.find((c) => c.primary);
        const cal = primary ?? items[0];
        const label = cal.summary ?? cal.id;
        if (typeof label === "string" && label.length > 0) return label;
      }
    }
  } catch {
    // Ignore execution errors (e.g. scope, rate limit)
  }
  return undefined;
}

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
    const toolkits = await Promise.all(
      items.map(async (t) => {
        const connected = t.connection?.isActive ?? false;
        let accountLabel: string | undefined;
        if (connected) {
          accountLabel = await resolveAccountLabel(session, t.slug);
        }
        return {
          slug: t.slug,
          name: t.name,
          connected,
          accountLabel: accountLabel ?? undefined,
        };
      })
    );
    return NextResponse.json({ toolkits });
  } catch (err) {
    console.error("[GET /api/connect/.../status]", err);
    return NextResponse.json(
      { error: "Failed to load connection status" },
      { status: 500 }
    );
  }
}
