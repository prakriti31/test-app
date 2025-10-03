// server/index.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios").default;
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.set("trust proxy", 1);

const {
  SERVER_ROOT = "http://localhost:4000",
  FRONTEND_ROOT = "http://localhost:5173",
  VITE_COMPOSIO_API_KEY,
  COMPOSIO_API_BASE,
  OPENAI_API_KEY,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET = "please-change-me"
} = process.env;

const allowedOrigins = [
  FRONTEND_ROOT,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed"), false);
  },
  credentials: true
}));
app.use(bodyParser.json());

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

function getServerOrigin(req) {
  if (SERVER_ROOT) return SERVER_ROOT;
  const xfProto = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  const xfHost = (req.headers["x-forwarded-host"] || "").toString().split(",")[0].trim();
  const proto = xfProto || req.protocol;
  const host = xfHost || req.get("host");
  return `${proto}://${host}`;
}

// Start Google OAuth flow
app.get("/api/auth/google", (req, res) => {
  const redirectUri = `${getServerOrigin(req)}/api/auth/google/callback`;
  const scope = encodeURIComponent("openid profile email https://www.googleapis.com/auth/calendar.readonly");
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&response_type=code&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

// OAuth callback: exchange code for tokens and store in session
app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code");
  try {
    const redirectUri = `${getServerOrigin(req)}/api/auth/google/callback`;
    const form = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    // Save tokens in session (access_token, refresh_token)
    req.session.tokens = tokenRes.data;
    res.redirect(FRONTEND_ROOT);
  } catch (err) {
    console.error("oauth error", err.response?.data || err.message);
    res.status(500).send("OAuth token exchange failed");
  }
});

// This endpoint is not needed - using the /api/auth/google/callback endpoint above


// logout
app.get("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.send({ ok: true }));
});

/**
 * fetchFromComposio: placeholder POST call to Composio MCP endpoint.
 * Replace endpoint/payload with your actual Composio docs.
 */
async function fetchFromComposio(accessToken) {
  const base = COMPOSIO_API_BASE || "https://api.composio.ai"; // override via env if needed
  const url = `${base}/v1/mcp/calendar/events`; // placeholder — adjust per Composio docs

  try {
    const resp = await axios.post(url, {
      provider: "google",
      provider_access_token: accessToken,
      max_events: 50
    }, {
      headers: { Authorization: `Bearer ${VITE_COMPOSIO_API_KEY}`, "Content-Type": "application/json" },
      timeout: 10000
    });

    const events = resp.data?.events || resp.data || [];
    return events.map(e => ({
      id: e.id || e.event_id || `${e.start}_${Math.random()}`,
      title: e.summary || e.title || "Untitled",
      startTime: e.start?.dateTime || e.start || e.start_time,
      endTime: e.end?.dateTime || e.end || e.end_time,
      attendees: (e.attendees || []).map(a => a.email || a).filter(Boolean),
      description: e.description || ""
    }));
  } catch (err) {
    console.warn("Composio fetch failed:", err.response?.data || err.message);
    throw err;
  }
}

// Optional fallback: direct Google Calendar API (for dev/testing only)
async function fetchFromGoogleCalendar(accessToken) {
  const timeMin = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(); // last 90 days
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(timeMin)}`;

  try {
    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const items = resp.data.items || [];
    return items.map(i => ({
      id: i.id,
      title: i.summary || "Untitled",
      startTime: i.start?.dateTime || i.start?.date,
      endTime: i.end?.dateTime || i.end?.date,
      attendees: (i.attendees || []).map(a => a.email).filter(Boolean),
      description: i.description || ""
    }));
  } catch (err) {
    console.error("Google fetch failed:", err.response?.data || err.message);
    throw err;
  }
}

function splitUpcomingPast(events) {
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startTime) > now)
    .sort((a,b)=> new Date(a.startTime).getTime()-new Date(b.startTime).getTime())
    .slice(0,5);
  const past = events.filter(e => new Date(e.startTime) <= now)
    .sort((a,b)=> new Date(b.startTime).getTime()-new Date(a.startTime).getTime())
    .slice(0,5);
  return { upcoming, past };
}

app.get("/api/meetings", async (req, res) => {
  const tokens = req.session.tokens;
  if (!tokens || !tokens.access_token) return res.status(401).json({ error: "not_authenticated" });

  const accessToken = tokens.access_token;

  // First try Composio MCP
  try {
    const events = await fetchFromComposio(accessToken);
    const { upcoming, past } = splitUpcomingPast(events);
    return res.json({ upcoming, past });
  } catch (err) {
    console.warn("Composio failed; attempting Google fallback");
  }

  // Fallback to Google Calendar (dev)
  try {
    const events = await fetchFromGoogleCalendar(accessToken);
    const { upcoming, past } = splitUpcomingPast(events);
    return res.json({ upcoming, past });
  } catch (err) {
    console.error("Both Composio and Google fetch failed.");
    return res.status(500).json({ error: "failed_to_fetch_events" });
  }
});

// Summarize meeting using OpenAI (server side)
app.post("/api/summarize", async (req, res) => {
  const { meeting } = req.body;
  if (!meeting) return res.status(400).json({ error: "missing_meeting" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "openai_not_configured" });

  // Format the meeting details
  const startDate = new Date(meeting.startTime).toLocaleDateString();
  const startTime = new Date(meeting.startTime).toLocaleTimeString();
  const endTime = new Date(meeting.endTime).toLocaleTimeString();
  const eventName = meeting.title;

  const prompt = `This event "${eventName}" was scheduled on ${startDate} from ${startTime} to ${endTime}. Based on the event name, write a short note about what this event could be about and what might have been discussed. Keep it concise and informative.`;

  try {
    const ores = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant that provides helpful summaries of calendar events based on their names and timing." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.3
    }, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" }
    });

    const summary = ores.data?.choices?.[0]?.message?.content || "No summary available";
    res.json({ summary });
  } catch (err) {
    console.error("OpenAI error:", err.response?.data || err.message);
    res.status(500).json({ error: "summarize_failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
