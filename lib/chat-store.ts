/**
 * File-based persistence for navigator chat threads and messages.
 * Threads are scoped by patientId. For production at scale, replace with a database.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { generateId } from "ai";
import type { UIMessage } from "ai";

export type ChatThread = {
  id: string;
  patientId: string;
  createdAt: string;
  /** First user message snippet for display; set when messages are saved */
  title?: string;
};

const CHATS_DIR = "chats";
const THREADS_FILE = "threads.json";

function getDataDir(): string {
  const dir =
    process.env.ARUL_DATA_DIR ||
    resolve(process.cwd(), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getChatsDir(): string {
  const dir = join(getDataDir(), CHATS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getThreadsPath(): string {
  return join(getDataDir(), CHATS_DIR, THREADS_FILE);
}

function getThreadFilePath(threadId: string): string {
  return join(getChatsDir(), `${threadId}.json`);
}

type ThreadsIndex = { threads: ChatThread[] };

function readThreadsIndex(): ThreadsIndex {
  const path = getThreadsPath();
  if (!existsSync(path)) return { threads: [] };
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as Partial<ThreadsIndex>;
    return {
      threads: Array.isArray(data.threads) ? data.threads : [],
    };
  } catch {
    return { threads: [] };
  }
}

function writeThreadsIndex(index: ThreadsIndex): void {
  const path = getThreadsPath();
  writeFileSync(path, JSON.stringify(index, null, 2), "utf-8");
}

/** Create a new chat thread for the given patient. Returns the new thread. */
export function createThread(patientId: string): ChatThread {
  const thread: ChatThread = {
    id: generateId(),
    patientId,
    createdAt: new Date().toISOString(),
  };
  const index = readThreadsIndex();
  index.threads.unshift(thread);
  writeThreadsIndex(index);
  writeFileSync(getThreadFilePath(thread.id), "[]", "utf-8");
  return thread;
}

/** List threads for a patient, newest first. */
export function listThreads(patientId: string): ChatThread[] {
  const index = readThreadsIndex();
  return index.threads
    .filter((t) => t.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/** Get a thread by id. */
export function getThread(threadId: string): ChatThread | undefined {
  const index = readThreadsIndex();
  return index.threads.find((t) => t.id === threadId);
}

/** Get messages for a thread. Returns [] if thread doesn't exist or has no messages. */
export function getMessages(threadId: string): UIMessage[] {
  const path = getThreadFilePath(threadId);
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Derive a short title from the first user message. */
function getTitleFromMessages(messages: UIMessage[]): string | undefined {
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) return undefined;
  const parts = (userMsg as { parts?: Array<{ type: string; text?: string }> }).parts;
  if (!parts?.length) return undefined;
  const textPart = parts.find((p) => p.type === "text") as { text?: string } | undefined;
  const text = textPart?.text?.trim();
  if (!text) return undefined;
  return text.length > 50 ? text.slice(0, 47) + "…" : text;
}

/** Save messages for a thread and optionally update thread title from first user message. */
export function saveMessages(threadId: string, messages: UIMessage[]): void {
  const path = getThreadFilePath(threadId);
  writeFileSync(path, JSON.stringify(messages, null, 2), "utf-8");
  const title = getTitleFromMessages(messages);
  if (title) {
    const index = readThreadsIndex();
    const idx = index.threads.findIndex((t) => t.id === threadId);
    if (idx !== -1) {
      index.threads[idx] = { ...index.threads[idx], title };
      writeThreadsIndex(index);
    }
  }
}
