"use client";

import { useState } from "react";

function getStr(o: unknown, ...keys: string[]): string {
  if (o == null || typeof o !== "object") return "";
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return "";
}

function getArr(o: unknown, ...keys: string[]): string[] {
  if (o == null || typeof o !== "object") return [];
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function EmailDraftCard({
  patientId,
  draftId,
  args,
}: {
  patientId: string;
  draftId: string;
  args: unknown;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const to = getStr(args, "recipient_email", "recipientEmail", "to");
  const cc = getArr(args, "cc");
  const bcc = getArr(args, "bcc");
  const extraTo = getArr(args, "extra_recipients", "extraRecipients");
  const subject = getStr(args, "subject");
  const body = getStr(args, "body", "message_body", "messageBody");
  const toList = [to, ...extraTo].filter(Boolean);

  const handleSend = async () => {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/send-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, draftId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? res.statusText);
        return;
      }
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to send");
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-arul-purple/30 bg-arul-purple/5 p-3 text-left">
      <p className="text-xs font-semibold text-arul-forest mb-2">Email draft — review before sending</p>
      {toList.length > 0 && (
        <p className="text-xs text-arul-navy mb-0.5">
          <span className="font-medium">To:</span> {toList.join(", ")}
        </p>
      )}
      {cc.length > 0 && (
        <p className="text-xs text-arul-navy mb-0.5">
          <span className="font-medium">Cc:</span> {cc.join(", ")}
        </p>
      )}
      {bcc.length > 0 && (
        <p className="text-xs text-arul-navy mb-0.5">
          <span className="font-medium">Bcc:</span> {bcc.join(", ")}
        </p>
      )}
      {subject && (
        <p className="text-xs text-arul-navy mb-0.5">
          <span className="font-medium">Subject:</span> {subject}
        </p>
      )}
      {body && (
        <div className="text-xs text-arul-navy mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-arul-purple/20 bg-white/60 p-2">
          {body.length > 400 ? `${body.slice(0, 400)}…` : body}
        </div>
      )}
      {status === "idle" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSend}
            className="rounded bg-arul-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-arul-purple-dark"
          >
            Send
          </button>
          <span className="text-xs text-stone-500 self-center">Draft is in the patient’s Gmail; you can also discard or edit there.</span>
        </div>
      )}
      {status === "sending" && (
        <p className="mt-2 text-xs text-arul-navy">Sending…</p>
      )}
      {status === "sent" && (
        <p className="mt-2 text-xs font-medium text-green-700">Sent.</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">{errorMessage ?? "Send failed."}</p>
      )}
    </div>
  );
}
