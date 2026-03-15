import {
  getFlow,
  updateFlow,
  deleteFlow,
} from "@/lib/store";
import { getPatient } from "@/lib/patients";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ patientId: string; flowId: string }> }
) {
  const { patientId, flowId } = await params;
  if (!patientId || !flowId) {
    return NextResponse.json(
      { error: "Missing patientId or flowId" },
      { status: 400 }
    );
  }
  const patient = getPatient(patientId);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  const flow = getFlow(flowId);
  if (!flow || flow.patientId !== patientId) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const updates: Parameters<typeof updateFlow>[1] = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (
      body.schedule === "morning" ||
      body.schedule === "evening" ||
      body.schedule === "daily"
    ) {
      updates.schedule = body.schedule;
    }
    if (typeof body.instructions === "string")
      updates.instructions = body.instructions.trim();
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    const updated = await updateFlow(flowId, updates);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/patients/.../flows/...]", err);
    return NextResponse.json(
      { error: "Failed to update flow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ patientId: string; flowId: string }> }
) {
  const { patientId, flowId } = await params;
  if (!patientId || !flowId) {
    return NextResponse.json(
      { error: "Missing patientId or flowId" },
      { status: 400 }
    );
  }
  const flow = getFlow(flowId);
  if (!flow || flow.patientId !== patientId) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }
  const ok = await deleteFlow(flowId);
  return NextResponse.json({ deleted: ok });
}
