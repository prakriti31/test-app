// src/api/calendar.ts
import axios from "axios";

axios.defaults.baseURL = (import.meta as any).env?.VITE_SERVER_ROOT || ""; // <-- set in Vercel
axios.defaults.withCredentials = true; // send cookies for session-backed auth


export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description?: string;
  location?: string;
}

// Call backend to fetch 5 upcoming + 5 past meetings (backend uses Composio/GCal)
export async function fetchMeetings(): Promise<{ upcoming: Meeting[]; past: Meeting[] }> {
  const res = await axios.get("/api/meetings");
  return res.data;
}

// Ask server to summarize a meeting (server uses OpenAI)
export async function summarizeMeeting(meeting: Meeting): Promise<{ summary: string }> {
  const res = await axios.post("/api/summarize", { meeting });
  return res.data;
}
