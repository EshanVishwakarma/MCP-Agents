import { createPatient, listPatients } from "@/lib/patients";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { NextResponse } from "next/server";

const composio = new Composio({ provider: new VercelProvider() });

export async function GET() {
  const patients = listPatients();
  const withConnections = await Promise.all(
    patients.map(async (p) => {
      try {
        const session = await composio.create(p.id, {
          manageConnections: false,
          toolkits: ["gmail", "googlecalendar"],
        });
        const { items } = await session.toolkits();
        const connections = items.map((t) => ({
          slug: t.slug,
          name: t.name,
          connected: t.connection?.isActive ?? false,
        }));
        return { ...p, connections };
      } catch {
        return { ...p, connections: [] };
      }
    })
  );
  return NextResponse.json(withConnections);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const displayName =
      typeof body.displayName === "string" ? body.displayName : undefined;
    const patient = await createPatient(displayName);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const link = `${baseUrl}/connect/${patient.id}`;
    return NextResponse.json({
      ...patient,
      link,
    });
  } catch (err) {
    console.error("[POST /api/patients]", err);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
