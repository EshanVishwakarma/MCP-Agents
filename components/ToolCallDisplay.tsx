"use client";

import { useState, useEffect } from "react";

type EmailItem = {
  category?: string;
  sender: string;
  subject: string;
  date?: string;
  snippet?: string;
};

/** Read-only tools whose output we show as a Gemini-cleaned summary first. */
function isReadTool(toolName: string): boolean {
  const n = toolName.toUpperCase();
  if (n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET")) return true;
  if (n.startsWith("GOOGLECALENDAR_LIST") || n === "GOOGLECALENDAR_GET_EVENT" || n.startsWith("GOOGLECALENDAR_LIST_")) return true;
  return false;
}

function isEmailTool(toolName: string): boolean {
  const n = toolName.toUpperCase();
  return n.startsWith("GMAIL_FETCH") || n.startsWith("GMAIL_LIST") || n.startsWith("GMAIL_GET");
}

const COMPOSIO_META_TOOLS = ["COMPOSIO_SEARCH_TOOLS", "COMPOSIO_MULTI_EXECUTE_TOOL", "COMPOSIO_REMOTE_WORKBENCH"];

function isMetaTool(toolName: string): boolean {
  return COMPOSIO_META_TOOLS.includes(toolName.toUpperCase());
}

/** Whether to treat this tool's output as email data and request structured email cards. */
function treatAsEmailOutput(toolName: string, output: unknown): boolean {
  if (isEmailTool(toolName)) return true;
  if (!isMetaTool(toolName) || output == null) return false;
  return true;
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
  const [emails, setEmails] = useState<EmailItem[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const requestEmailStructure = treatAsEmailOutput(toolName, output);
  const effectiveEmailTool = isEmailTool(toolName) || (isMetaTool(toolName) && requestEmailStructure);
  const canClean =
    !isLoading &&
    output !== undefined &&
    (isReadTool(toolName) || isMetaTool(toolName));

  const apiToolName = requestEmailStructure ? "GMAIL_FETCH_EMAILS" : toolName;

  useEffect(() => {
    if (!canClean || summary !== null || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    fetch("/api/clean-tool-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName: apiToolName, output }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data: { summary?: string; emails?: EmailItem[] }) => {
        setSummary(typeof data.summary === "string" ? data.summary : null);
        setEmails(
          Array.isArray(data.emails) && data.emails.length > 0 ? data.emails : null
        );
      })
      .catch((e) => {
        setSummaryError(e instanceof Error ? e.message : "Failed to load summary");
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [canClean, apiToolName, output, summary, emails, summaryLoading]);

  const streamlined = isMetaTool(toolName);
  const showContent =
    !isLoading &&
    ((effectiveEmailTool && emails && emails.length > 0) ||
      (summary != null && !summaryLoading));

  if (streamlined) {
    return (
      <span className="inline-block w-full">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-arul-navy/80 py-1">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-arul-teal/30 border-t-arul-teal" />
            <span>Loading…</span>
          </div>
        )}
        {!isLoading && canClean && summaryLoading && (
          <div className="flex items-center gap-2 text-xs text-arul-navy/80 py-1">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-arul-teal/30 border-t-arul-teal" />
            <span>Formatting…</span>
          </div>
        )}
        {!isLoading && summaryError && (
          <p className="text-xs text-red-600 py-1">{summaryError}</p>
        )}
        {showContent && effectiveEmailTool && emails && emails.length > 0 && (
          <div className="mt-1 space-y-2 w-full">
            {summary && <p className="text-xs text-arul-navy/90">{summary}</p>}
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {emails.map((email, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-arul-purple/25 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-3 py-2 bg-arul-purple/5 border-b border-arul-purple/15 flex flex-wrap items-center gap-2">
                    {email.category && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-arul-purple bg-arul-purple/20 px-1.5 py-0.5 rounded">
                        {email.category}
                      </span>
                    )}
                    <span className="text-xs font-medium text-arul-forest truncate">
                      {email.sender}
                    </span>
                    {email.date && (
                      <span className="text-[10px] text-stone-500 ml-auto">
                        {email.date}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2 text-xs text-arul-navy">
                    <p className="font-medium text-arul-forest truncate" title={email.subject}>
                      {email.subject}
                    </p>
                    {email.snippet && (
                      <p className="mt-0.5 text-arul-navy/80 line-clamp-2">
                        {email.snippet}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showContent && !(effectiveEmailTool && emails && emails.length > 0) && summary && (
          <div className="mt-1 rounded-md border border-arul-teal/20 bg-white/80 p-2 text-xs text-arul-navy whitespace-pre-wrap">
            {summary}
          </div>
        )}
      </span>
    );
  }

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
      {!isLoading && effectiveEmailTool && emails && emails.length > 0 && (
        <div className="mt-2 ml-0 space-y-2 w-full">
          {summary && <p className="text-xs text-arul-navy/90">{summary}</p>}
          <div className="grid gap-2 max-h-80 overflow-y-auto">
            {emails.map((email, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-arul-purple/25 bg-white shadow-sm overflow-hidden"
              >
                <div className="px-3 py-2 bg-arul-purple/5 border-b border-arul-purple/15 flex flex-wrap items-center gap-2">
                  {email.category && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-arul-purple bg-arul-purple/20 px-1.5 py-0.5 rounded">
                      {email.category}
                    </span>
                  )}
                  <span className="text-xs font-medium text-arul-forest truncate">
                    {email.sender}
                  </span>
                  {email.date && (
                    <span className="text-[10px] text-stone-500 ml-auto">
                      {email.date}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2 text-xs text-arul-navy">
                  <p className="font-medium text-arul-forest truncate" title={email.subject}>
                    {email.subject}
                  </p>
                  {email.snippet && (
                    <p className="mt-0.5 text-arul-navy/80 line-clamp-2">
                      {email.snippet}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {expanded && !isLoading && (
        <div className="mt-1 ml-1 space-y-1">
          {(isReadTool(toolName) || isMetaTool(toolName)) && (
            <>
              {summaryLoading && (
                <p className="text-xs text-arul-navy/70">Formatting…</p>
              )}
              {summaryError && (
                <p className="text-xs text-red-600">{summaryError}</p>
              )}
              {summary && !summaryLoading && (
                <>
                  {effectiveEmailTool && emails && emails.length > 0 ? (
                    <p className="text-xs text-arul-navy/90">See email cards above.</p>
                  ) : (
                    <div className="rounded-md border border-arul-teal/20 bg-white/80 p-2 text-xs text-arul-navy whitespace-pre-wrap">
                      {summary}
                    </div>
                  )}
                </>
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
          {(showRaw || (!isReadTool(toolName) && !isMetaTool(toolName))) && (
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
