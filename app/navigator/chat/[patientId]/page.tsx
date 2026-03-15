"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArulHealthText } from "@/components/ArulHealthText";
import { CalendarApprovalCard } from "@/components/CalendarApprovalCard";
import { EmailDraftCard } from "@/components/EmailDraftCard";
import { ToolCallDisplay } from "@/components/ToolCallDisplay";

type ToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-");
}

function getToolNameFromPart(part: ToolPart): string {
  return part.type.replace(/^tool-/, "");
}

function getDraftIdFromResult(result: unknown): string | null {
  if (result == null || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const id = r.draft_id ?? r.id;
  if (typeof id === "string" && id.length > 0) return id;
  const data = r.data;
  if (data != null && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const dataId = d.draft_id ?? d.id;
    if (typeof dataId === "string" && dataId.length > 0) return dataId;
  }
  return null;
}

const PROPOSE_CALENDAR_TOOLS = ["PROPOSE_CALENDAR_CREATE", "PROPOSE_CALENDAR_UPDATE", "PROPOSE_CALENDAR_PATCH", "PROPOSE_CALENDAR_DELETE"] as const;
type CalendarAction = "create" | "update" | "patch" | "delete";

const META_TOOL_NAMES = ["COMPOSIO_SEARCH_TOOLS", "COMPOSIO_MULTI_EXECUTE_TOOL", "COMPOSIO_REMOTE_WORKBENCH"];

function isStreamlinedToolName(name: string): boolean {
  const n = name.toUpperCase();
  if (META_TOOL_NAMES.includes(n)) return true;
  if (n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET")) return true;
  if (n.startsWith("GOOGLECALENDAR_LIST") || n === "GOOGLECALENDAR_GET_EVENT") return true;
  return false;
}

/** True if this message has at least one tool part that renders as streamlined content (email/calendar cards or summary). */
function messageHasStreamlinedToolOutput(parts: Array<{ type: string; toolInvocation?: { toolName?: string }; output?: unknown }>): boolean {
  return parts.some((part) => {
    if (part.type === "tool-invocation" && part.toolInvocation?.toolName) {
      return isStreamlinedToolName(part.toolInvocation.toolName);
    }
    if (part.type.startsWith("tool-")) {
      const name = part.type.replace(/^tool-/, "");
      return isStreamlinedToolName(name);
    }
    return false;
  });
}

/** Index of the last streamlined tool part in the message. We only show that one so the user sees the extended readout, not earlier partial ones. */
function getLastStreamlinedToolPartIndex(parts: Array<{ type: string; toolInvocation?: { toolName?: string }; output?: unknown }>): number {
  let last = -1;
  parts.forEach((part, i) => {
    if (part.type === "tool-invocation" && part.toolInvocation?.toolName && isStreamlinedToolName(part.toolInvocation.toolName)) {
      last = i;
    }
    if (part.type.startsWith("tool-") && isStreamlinedToolName(part.type.replace(/^tool-/, ""))) {
      last = i;
    }
  });
  return last;
}

function getCalendarPendingFromResult(
  toolName: string,
  result: unknown
): { action: CalendarAction; params: Record<string, unknown> } | null {
  if (result == null || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const type = r.type;
  if (type !== "pending_calendar_create" && type !== "pending_calendar_update" && type !== "pending_calendar_patch" && type !== "pending_calendar_delete") return null;
  const action: CalendarAction = type.replace("pending_calendar_", "") as CalendarAction;
  const { type: _t, ...params } = r;
  return { action, params: params as Record<string, unknown> };
}

export default function NavigatorChatPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat?patientId=${encodeURIComponent(patientId)}`,
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-6">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <ArulHealthText href="/navigator" size="sm" />
          <Link
            href="/navigator"
            className="text-sm text-arul-purple hover:underline font-medium"
          >
            ← Dashboard
          </Link>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-arul-forest">Chat (patient)</h1>
          <p className="text-sm text-stone-500 mt-0.5 font-mono">
            {patientId.slice(0, 8)}…
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded-xl border border-arul-purple/20 bg-arul-purple/5 p-6 text-center">
            <p className="text-arul-forest/90 mb-3">
              You are chatting on behalf of this patient. Tools use their connected accounts (Gmail, calendar, etc.).
            </p>
            <p className="text-xs text-stone-500 mb-2">Try:</p>
            <ul className="text-sm text-arul-purple-dark space-y-1">
              <li>“Check the patient’s calendar for this week”</li>
              <li>“Summarize recent emails from their provider”</li>
              <li>“Send a reminder from their account”</li>
            </ul>
          </div>
        )}
        {messages.map((m, msgIndex) => {
          const prevMsg = messages[msgIndex - 1];
          const prevText = prevMsg
            ? typeof (prevMsg as { content?: string }).content === "string"
              ? (prevMsg as { content: string }).content
              : ((prevMsg as { parts?: Array<{ type: string; text?: string }> }).parts ?? [])
                  .map((p) => (p.type === "text" ? (p as { text?: string }).text ?? "" : ""))
                  .join(" ")
            : "";
          const userAskedAboutCalendar =
            prevMsg?.role === "user" && /calendar|schedule|event|upcoming/i.test(prevText);
          return (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`rounded-xl px-4 py-3 max-w-[85%] ${
                m.role === "user"
                  ? "bg-arul-purple text-white"
                  : "bg-white border border-arul-purple/20 text-arul-forest"
              }`}
            >
              <span className="font-semibold text-xs opacity-80 block mb-1">
                {m.role === "user" ? "You" : "Assistant"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const parts = m.parts ?? [];
                  const lastStreamlinedIdx = getLastStreamlinedToolPartIndex(parts);
                  return (
                    <>
                      {parts.length === 0 && m.role === "assistant" && (
                        <span className="text-stone-400 italic">Waiting for response…</span>
                      )}
                      {parts.map((part, i) => {
                        if (part.type === "text") {
                          const rawText = String((part as { text?: string }).text ?? "");
                          // Hide model text when we have tool output so we don't show misleading "no emails" / "tool metadata" lines.
                          const hasAnyToolPart = parts.some(
                            (p) => p.type === "tool-invocation" || (p.type && p.type.startsWith("tool-"))
                          );
                          const looksLikeNoEmailsMessage =
                            /no emails|no email list|tool metadata|provided tool output|not actual email|calendar operations.*not emails/i.test(rawText);
                          const wrongReplyForCalendar =
                            userAskedAboutCalendar && /no emails/i.test(rawText);
                          if (
                            m.role === "assistant" &&
                            (messageHasStreamlinedToolOutput(parts) ||
                              (hasAnyToolPart && looksLikeNoEmailsMessage) ||
                              wrongReplyForCalendar)
                          ) {
                            return null;
                          }
                    if (!rawText.trim()) return null;
                    return (
                      <span key={i}>
                        {rawText
                          .split(/(https?:\/\/[^\s)]+)/g)
                          .map((segment, j) =>
                            segment.match(/^https?:\/\//) ? (
                              <a
                                key={j}
                                href={segment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline opacity-90"
                              >
                                {segment}
                              </a>
                            ) : (
                              segment
                            )
                          )}
                      </span>
                    );
                  }
                  if (part.type === "tool-invocation" && "toolInvocation" in part) {
                    const inv = (part as { toolInvocation: { toolName?: string; state?: string; args?: unknown; result?: unknown; toolCallId?: string } }).toolInvocation;
                    const name = inv.toolName ?? "tool";
                    const loading = inv.state !== "result";
                    const isEmailDraft = name === "GMAIL_CREATE_EMAIL_DRAFT";
                    const draftId = !loading && isEmailDraft ? getDraftIdFromResult(inv.result) : null;
                    if (isEmailDraft && draftId && patientId) {
                      return (
                        <div key={inv.toolCallId ?? `tool-${i}`} className="w-full">
                          <ToolCallDisplay
                            toolName={name}
                            input={inv.args}
                            output={inv.result}
                            isLoading={false}
                          />
                          <EmailDraftCard
                            patientId={patientId}
                            draftId={draftId}
                            args={inv.args ?? {}}
                          />
                        </div>
                      );
                    }
                    const calendarPending = !loading && PROPOSE_CALENDAR_TOOLS.includes(name as (typeof PROPOSE_CALENDAR_TOOLS)[number])
                      ? getCalendarPendingFromResult(name, inv.result)
                      : null;
                    if (calendarPending && patientId) {
                      return (
                        <div key={inv.toolCallId ?? `tool-${i}`} className="w-full">
                          <ToolCallDisplay
                            toolName={name}
                            input={inv.args}
                            output={inv.result}
                            isLoading={false}
                          />
                          <CalendarApprovalCard
                            patientId={patientId}
                            action={calendarPending.action}
                            params={calendarPending.params}
                          />
                        </div>
                      );
                    }
                    // Only show the last streamlined (email/calendar) readout so we don't show an earlier short one plus the extended one
                    if (isStreamlinedToolName(name) && i !== lastStreamlinedIdx) {
                      return null;
                    }
                    return (
                      <ToolCallDisplay
                        key={inv.toolCallId ?? `tool-${i}`}
                        toolName={name}
                        input={inv.args}
                        output={inv.result}
                        isLoading={loading}
                      />
                    );
                  }
                  if (isToolPart(part as ToolPart)) {
                    const toolPart = part as ToolPart;
                    const name = getToolNameFromPart(toolPart);
                    const loading =
                      toolPart.state !== "output-available" &&
                      toolPart.state !== "output-error";
                    const isEmailDraftLegacy = name === "GMAIL_CREATE_EMAIL_DRAFT";
                    const draftIdLegacy = !loading && isEmailDraftLegacy ? getDraftIdFromResult(toolPart.output) : null;
                    if (isEmailDraftLegacy && draftIdLegacy && patientId) {
                      return (
                        <div key={toolPart.toolCallId ?? i} className="w-full">
                          <ToolCallDisplay
                            toolName={name}
                            input={toolPart.input}
                            output={toolPart.output}
                            isLoading={false}
                          />
                          <EmailDraftCard
                            patientId={patientId}
                            draftId={draftIdLegacy}
                            args={toolPart.input ?? {}}
                          />
                        </div>
                      );
                    }
                    const calendarPendingLegacy = !loading && PROPOSE_CALENDAR_TOOLS.includes(name as (typeof PROPOSE_CALENDAR_TOOLS)[number])
                      ? getCalendarPendingFromResult(name, toolPart.output)
                      : null;
                    if (calendarPendingLegacy && patientId) {
                      return (
                        <div key={toolPart.toolCallId ?? i} className="w-full">
                          <ToolCallDisplay
                            toolName={name}
                            input={toolPart.input}
                            output={toolPart.output}
                            isLoading={false}
                          />
                          <CalendarApprovalCard
                            patientId={patientId}
                            action={calendarPendingLegacy.action}
                            params={calendarPendingLegacy.params}
                          />
                        </div>
                      );
                    }
                    if (isStreamlinedToolName(name) && i !== lastStreamlinedIdx) {
                      return null;
                    }
                    return (
                      <ToolCallDisplay
                        key={toolPart.toolCallId ?? i}
                        toolName={name}
                        input={toolPart.input}
                        output={toolPart.output}
                        isLoading={loading}
                      />
                    );
                  }
                  return null;
                })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          );
        })}
        {isLoading && (
          <p className="text-sm text-stone-500 flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-arul-purple/30 border-t-arul-purple" />
            Thinking…
          </p>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 opacity-90">{error.message}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex gap-2 mt-4 pt-4 border-t border-stone-200"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this patient’s calendar, email, reminders…"
          disabled={isLoading}
          className="flex-1 p-3 border border-arul-purple/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-arul-purple/50 placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-3 bg-arul-purple text-white font-medium rounded-lg hover:bg-arul-purple-dark transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
