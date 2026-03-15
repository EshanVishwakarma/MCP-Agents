import { createFlow, getFlowsByPatient } from "@/lib/store";
import { getPatient } from "@/lib/patients";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId" }, { status: 400 });
  }
  const patient = getPatient(patientId);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  const flows = getFlowsByPatient(patientId);
  return NextResponse.json(flows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId" }, { status: 400 });
  }
  const patient = getPatient(patientId);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const schedule =
      body.schedule === "morning" ||
      body.schedule === "evening" ||
      body.schedule === "daily"
        ? body.schedule
        : "daily";
    const instructions =
      typeof body.instructions === "string" ? body.instructions.trim() : "";
    if (!name || !instructions) {
      return NextResponse.json(
        { error: "Name and instructions are required" },
        { status: 400 }
      );
    }
    const flow = await createFlow({
      patientId,
      name,
      schedule,
      instructions,
    });
    return NextResponse.json(flow);
  } catch (err) {
    console.error("[POST /api/patients/.../flows]", err);
    return NextResponse.json(
      { error: "Failed to create flow" },
      { status: 500 }
    );
  }
}
