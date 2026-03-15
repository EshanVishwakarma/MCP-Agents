import { z } from "zod";
import { tool } from "ai";

const pendingPayload = (type: string, params: Record<string, unknown>) =>
  ({ type, ...params });

const createSchema = z.object({
  summary: z.string().optional().describe("Event title"),
  description: z.string().optional(),
  location: z.string().optional(),
  calendar_id: z.string().optional().describe("Calendar ID, use 'primary' for default"),
  start: z.string().optional().describe("Start time ISO 8601 or RFC3339"),
  end: z.string().optional().describe("End time ISO 8601 or RFC3339"),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  timezone: z.string().optional(),
  attendees: z.array(z.string()).optional().describe("Attendee email addresses"),
}).passthrough();

const updateSchema = z.object({
  event_id: z.string().describe("ID of the event to update"),
  calendar_id: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  attendees: z.array(z.string()).optional(),
}).passthrough();

const patchSchema = z.object({
  event_id: z.string().describe("ID of the event to patch"),
  calendar_id: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
}).passthrough();

const deleteSchema = z.object({
  event_id: z.string().describe("ID of the event to delete"),
  calendar_id: z.string().optional(),
});

export const proposeCalendarTools = {
  PROPOSE_CALENDAR_CREATE: tool({
    description: "Propose creating a new calendar event for the patient. Use this instead of creating the event directly; the navigator must approve before the event is added.",
    inputSchema: createSchema,
    execute: async (params) => {
      const p = typeof params === "string" ? JSON.parse(params) : params;
      return pendingPayload("pending_calendar_create", p as Record<string, unknown>);
    },
  }),
  PROPOSE_CALENDAR_UPDATE: tool({
    description: "Propose updating an existing calendar event. Use this instead of updating directly; the navigator must approve before the change is applied.",
    inputSchema: updateSchema,
    execute: async (params) => {
      const p = typeof params === "string" ? JSON.parse(params) : params;
      return pendingPayload("pending_calendar_update", p as Record<string, unknown>);
    },
  }),
  PROPOSE_CALENDAR_PATCH: tool({
    description: "Propose patching (partial update) of a calendar event. Use this instead of patching directly; the navigator must approve.",
    inputSchema: patchSchema,
    execute: async (params) => {
      const p = typeof params === "string" ? JSON.parse(params) : params;
      return pendingPayload("pending_calendar_patch", p as Record<string, unknown>);
    },
  }),
  PROPOSE_CALENDAR_DELETE: tool({
    description: "Propose deleting a calendar event. Use this instead of deleting directly; the navigator must approve before the event is removed.",
    inputSchema: deleteSchema,
    execute: async (params) => {
      const p = typeof params === "string" ? JSON.parse(params) : params;
      return pendingPayload("pending_calendar_delete", p as Record<string, unknown>);
    },
  }),
};

export const CALENDAR_WRITE_TOOLS_DISABLED = [
  "GOOGLECALENDAR_CREATE_EVENT",
  "GOOGLECALENDAR_UPDATE_EVENT",
  "GOOGLECALENDAR_PATCH_EVENT",
  "GOOGLECALENDAR_DELETE_EVENT",
];
