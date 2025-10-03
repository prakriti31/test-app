import type { Meeting } from "../types/meeting";

/**
 * Simple mock summary generator for past meetings.
 * Replace with real LLM integration (server-side) when ready.
 *
 * Example: call your serverless function that uses OpenAI to generate a summary.
 */

export const generateMockSummary = (meeting: Meeting): string => {
  // Simple heuristic-based summary:
  const time = new Date(meeting.startTime).toLocaleString();
  const attendees = meeting.attendees.join(", ");
  const bullets = [
    "Reviewed progress on key milestones",
    "Identified 2 blockers",
    "Assigned follow-up actions"
  ];
  return `On ${time} with ${attendees}. Key points: ${bullets.join("; ")}.`;
};

/**
 * Optional sample server call pattern (recommended to implement server-side):
 *
 * // server/src/summary.ts (example)
 * import OpenAI from 'openai';
 * const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 * export async function summarizeMeeting(meeting) {
 *   const prompt = `Summarize this meeting notes: ${JSON.stringify(meeting)}`;
 *   const resp = await client.responses.create({ model: "gpt-4o-mini", input: prompt });
 *   return resp.output[0].content[0].text;
 * }
 *
 * Then call that from the client: fetch('/api/summarize', { method: 'POST', body: JSON.stringify(meeting) })
 */
