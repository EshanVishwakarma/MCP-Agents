"use client";

import { useState } from "react";

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
        <pre className="mt-1 ml-1 max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-arul-teal/20 bg-white/80 p-2 text-xs text-arul-navy">
          {output != null
            ? String(JSON.stringify(output, null, 2))
            : String(JSON.stringify(input, null, 2))}
        </pre>
      )}
    </span>
  );
}
