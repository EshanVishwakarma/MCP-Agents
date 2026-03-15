# Gmail retrieval & drafting: Composio reference

Summary of how [ComposioHQ/composio-fastapi](https://github.com/ComposioHQ/composio-fastapi) and [ComposioHQ/open-email-assistant](https://github.com/ComposioHQ/open-email-assistant) handle Gmail and how we avoid the "thinking loop."

## composio-fastapi (simple, no agentic loop)

- **Pattern**: Single round. Fetch a fixed list of Gmail tools with `composio.tools.get(user_id, tools=["GMAIL_FETCH_EMAILS", "GMAIL_SEND_EMAIL", "GMAIL_CREATE_EMAIL_DRAFT"])`, pass to OpenAI `chat.completions.create`, then `composio.provider.handle_tool_calls(response, user_id)` once.
- **No streaming**, no multi-step agent loop. One request → one response → one tool-handling pass. So there is no "thinking loop"; the agent cannot keep calling tools.
- **Trade-off**: No discovery (model only has those three tools). Composio docs mark `tools.get` / `handle_tool_calls` as discouraged for typical flows; this repo uses them for a simple, non-streaming agent.

## open-email-assistant (Tool Router + MCP, LangGraph)

- **Pattern**: Scoped **Tool Router** session: `composio.experimental.tool_router.create_session(user_id=..., toolkits=[{"toolkit": "gmail", "auth_config_id": ...}])`. Tools are obtained via **MCP** (`MultiServerMCPClient` with the session URL), then passed to LangChain/LangGraph.
- **Agent loop**: LangGraph runs until the model returns no tool calls (`should_continue` → END). No explicit max-step cap in the snippet; the graph can run multiple model/tool rounds until the model stops calling tools.
- **Response**: They **do not stream** the agent. They `graph.ainvoke(...)` and return only `last_message.content` (the final assistant text). So the frontend never shows an intermediate "thinking" state that never ends; they wait for the full run and return one string.
- **tools.py**: Used for **direct** helpers (e.g. `fetch_user_emails` via `composio.tools.execute("GMAIL_FETCH_EMAILS", ...)`). The conversational agent does not use tools.py; it uses MCP tools from the Tool Router.

## Our approach (Arul Health)

- We use **session-based** Composio with **Vercel AI SDK** and **Gemini**: `composio.create(patientId, { toolkits: ["gmail", "googlecalendar"], ... })` and `session.tools()` (meta tools), then `streamText(..., tools, stopWhen: stepCountIs(5))`.
- **Streaming** is required for the navigator UX, so we do not switch to a single blocking invoke like open-email-assistant.
- **Thinking loop fix**: We cap steps with `stepCountIs(5)` (reduced from 10) so the stream ends after at most 5 model/tool steps. We also instruct the model in the system prompt: after fetching emails or calendar, respond with one short line and do not call any more tools.
- **Gmail retrieval**: Handled by meta tools (e.g. COMPOSIO_SEARCH_TOOLS → COMPOSIO_MULTI_EXECUTE_TOOL) discovered from the scoped session. Results are cleaned and shown as email/calendar cards via `/api/clean-tool-output` and `ToolCallDisplay`.
- **Drafting**: We disable `GMAIL_SEND_EMAIL` and `GMAIL_SEND_DRAFT` in the session; the model uses only `GMAIL_CREATE_EMAIL_DRAFT`. The navigator approves and sends via `POST /api/send-draft`.

## Takeaways

| Concern | composio-fastapi | open-email-assistant | Arul Health |
|--------|------------------|----------------------|-------------|
| Tool source | `tools.get()` fixed list | Tool Router MCP (gmail) | `session.tools()` meta, scoped gmail + googlecalendar |
| Loop | None (single round) | LangGraph until no tool calls | streamText with stepCountIs(5) |
| Streaming | No | No (ainvoke, return last message) | Yes |
| Thinking loop risk | None | Low (blocking run) | Mitigated by 5-step cap + prompt |

For a future "simple summarize emails" path without an agentic loop, we could add a dedicated flow that calls GMAIL_FETCH_EMAILS directly (e.g. via a separate API that uses Composio execute) and then uses Gemini to summarize, returning that result without streaming tool rounds.
