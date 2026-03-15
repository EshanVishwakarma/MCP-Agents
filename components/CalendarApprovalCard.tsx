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

export function CalendarApprovalCard({
  patientId,
  action,
  params,
}: {
  patientId: string;
  action: "create" | "update" | "patch" | "delete";
  params: Record<string, unknown>;
}) {
  const [status, setStatus] = useState<"idle" | "executing" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summary = getStr(params, "summary");
  const start = getStr(params, "start", "start_datetime");
  const end = getStr(params, "end", "end_datetime");
  const location = getStr(params, "location");
  const eventId = getStr(params, "event_id");

  const label =
    action === "create"
      ? "Add event"
      : action === "delete"
        ? "Delete event"
        : action === "update"
          ? "Update event"
          : "Patch event";

  const handleApprove = async () => {
    setStatus("executing");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/execute-calendar-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, action, ...params }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? res.statusText);
        return;
      }
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to execute");
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-arul-teal/40 bg-arul-mint/20 p-3 text-left">
      <p className="text-xs font-semibold text-arul-forest mb-2">
        {label} — approve before applying
      </p>
      {action === "create" && (
        <>
          {summary && <p className="text-xs text-arul-navy"><span className="font-medium">Title:</span> {summary}</p>}
          {(start || end) && (
            <p className="text-xs text-arul-navy">
              <span className="font-medium">When:</span> {start || "—"} → {end || "—"}
            </p>
          )}
          {location && <p className="text-xs text-arul-navy"><span className="font-medium">Where:</span> {location}</p>}
        </>
      )}
      {(action === "update" || action === "patch") && (
        <>
          {eventId && <p className="text-xs text-arul-navy"><span className="font-medium">Event ID:</span> {eventId}</p>}
          {summary && <p className="text-xs text-arul-navy"><span className="font-medium">Title:</span> {summary}</p>}
          {(start || end) && (
            <p className="text-xs text-arul-navy">
              <span className="font-medium">When:</span> {start || "—"} → {end || "—"}
            </p>
          )}
          {location && <p className="text-xs text-arul-navy"><span className="font-medium">Where:</span> {location}</p>}
        </>
      )}
      {action === "delete" && (
        <p className="text-xs text-arul-navy">
          <span className="font-medium">Event ID:</span> {eventId || "—"}
        </p>
      )}
      {status === "idle" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            className="rounded bg-arul-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-arul-teal-dark"
          >
            Approve
          </button>
          <span className="text-xs text-stone-500 self-center">Cancel: do nothing; the change will not be applied.</span>
        </div>
      )}
      {status === "executing" && <p className="mt-2 text-xs text-arul-navy">Applying…</p>}
      {status === "done" && <p className="mt-2 text-xs font-medium text-green-700">Done.</p>}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">{errorMessage ?? "Action failed."}</p>
      )}
    </div>
  );
}
