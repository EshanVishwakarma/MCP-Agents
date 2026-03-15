import { NextResponse } from "next/server";
import { createThread, listThreads } from "@/lib/chat-store";

export async function GET(req: Request) {
  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json(
      { error: "patientId is required" },
      { status: 400 }
    );
  }
  const threads = listThreads(patientId);
  return NextResponse.json(threads);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patientId = body?.patientId as string | undefined;
    if (!patientId?.trim()) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }
    const thread = createThread(patientId.trim());
    return NextResponse.json(thread);
  } catch (err) {
    console.error("[chat/threads POST]", err);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
