# Arul Health — Healthcare navigation chat

A Next.js chat app that helps people navigate healthcare using an AI assistant with [Composio](https://docs.composio.dev) tools. The agent can use Gmail, Google Calendar, Slack, Notion, and 1000+ other apps to help with appointments, insurance, records, and care coordination.

## Prerequisites

- Node.js 18+ (or [Bun](https://bun.sh))
- [Composio API key](https://platform.composio.dev/settings)
- [Anthropic API key](https://console.anthropic.com/) (for Claude)

## Setup

1. **Install dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

2. **Environment variables**

   Copy the example env file and add your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and set:

   - `COMPOSIO_API_KEY` — from [Composio Settings](https://platform.composio.dev/settings)
   - `ANTHROPIC_API_KEY` — from [Anthropic Console](https://console.anthropic.com/)

   Do not commit `.env.local`; it is gitignored.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## What you can do

- **Appointments:** e.g. “Add my next doctor appointment to my calendar”
- **Provider communication:** e.g. “Summarize my recent emails from my provider”
- **Reminders and coordination:** e.g. “Send a reminder to my family about my follow-up”

The assistant can connect apps (Gmail, Google Calendar, etc.) via in-chat OAuth when needed. Tool calls appear in the UI with a spinner while running and a checkmark when complete; click to expand and see input/output.

## Stack

- **Next.js** (App Router)
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`) + **Anthropic** (`@ai-sdk/anthropic`)
- **Composio** (`@composio/core`, `@composio/vercel`) for tool discovery, auth, and execution

## Security

- Keep API keys in `.env.local` only; never commit them.
- In production, replace the hardcoded `user_123` in `app/api/chat/route.ts` with the authenticated user ID from your auth system.

## References

- [Composio — Build a Chat App](https://docs.composio.dev/cookbooks/chat-app)
- [Composio — Vercel provider](https://docs.composio.dev/docs/providers/vercel)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
