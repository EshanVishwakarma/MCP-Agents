import { NextResponse } from "next/server";
import { getMessages, getThread } from "@/lib/chat-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  }
  const thread = getThread(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const messages = getMessages(threadId);
  return NextResponse.json({ thread, messages });
}
