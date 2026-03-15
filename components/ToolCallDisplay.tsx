"use client";

import { useState, useEffect } from "react";

/** Read-only tools whose output we show as a Gemini-cleaned summary first. */
function isReadTool(toolName: string): boolean {
  const n = toolName.toUpperCase();
  if (n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET")) return true;
  if (n.startsWith("GOOGLECALENDAR_LIST") || n === "GOOGLECALENDAR_GET_EVENT" || n.startsWith("GOOGLECALENDAR_LIST_")) return true;
  return false;
}

export function ToolCallDisplay({
  toolName,
  input,
  output,
  isLoading,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const canClean = !isLoading && output !== undefined && isReadTool(toolName);

  useEffect(() => {
    if (!canClean || summary !== null || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    fetch("/api/clean-tool-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, output }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data: { summary?: string }) => {
        setSummary(typeof data.summary === "string" ? data.summary : null);
      })
      .catch((e) => {
        setSummaryError(e instanceof Error ? e.message : "Failed to load summary");
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [canClean, toolName, output, summary, summaryLoading]);

  return (
    <span className="inline-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
          isLoading
            ? "border-arul-sage/40 bg-arul-mint/20 text-arul-navy/70"
            : "border-arul-teal/30 bg-arul-mint/30 text-arul-navy hover:bg-arul-mint/50"
        }`}
      >
        {isLoading ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-arul-teal/30 border-t-arul-teal" />
        ) : (
          <span className="text-arul-teal-dark">✓</span>
        )}
        <code className="font-mono">{toolName}</code>
        {!isLoading && (
          <span className="text-arul-navy/50">{expanded ? "▴" : "▾"}</span>
        )}
      </button>
      {expanded && !isLoading && (
        <div className="mt-1 ml-1 space-y-1">
          {isReadTool(toolName) && (
            <>
              {summaryLoading && (
                <p className="text-xs text-arul-navy/70">Formatting…</p>
              )}
              {summaryError && (
                <p className="text-xs text-red-600">{summaryError}</p>
              )}
              {summary && !summaryLoading && (
                <div className="rounded-md border border-arul-teal/20 bg-white/80 p-2 text-xs text-arul-navy whitespace-pre-wrap">
                  {summary}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="text-xs text-arul-purple hover:underline"
              >
                {showRaw ? "Hide raw" : "Show raw"}
              </button>
            </>
          )}
          {(showRaw || !isReadTool(toolName)) && (
            <pre className="max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-arul-teal/20 bg-white/80 p-2 text-xs text-arul-navy">
              {output != null
                ? String(JSON.stringify(output, null, 2))
                : String(JSON.stringify(input, null, 2))}
            </pre>
          )}
        </div>
      )}
    </span>
  );
}
