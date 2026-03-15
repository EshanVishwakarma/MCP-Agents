"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArulLogo } from "@/components/ArulLogo";
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
          <Link href="/navigator" className="inline-block">
            <ArulLogo height={28} />
          </Link>
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
        {messages.map((m) => (
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
                {(m.parts ?? []).length === 0 && m.role === "assistant" && (
                  <span className="text-stone-400 italic">Waiting for response…</span>
                )}
                {(m.parts ?? []).map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <span key={i}>
                        {String((part as { text?: string }).text ?? "")
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
              </div>
            </div>
          </div>
        ))}
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
