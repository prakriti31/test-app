// src/components/MeetingsList.tsx
import React, { useEffect, useState } from "react";
import { fetchMeetings, type Meeting, summarizeMeeting } from "../api/calendar";
import MeetingCard from "./MeetingsCard";
import axios from "axios";

const MeetingsList: React.FC = () => {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetchMeetings()
      .then((data) => {
        setUpcoming(data.upcoming);
        setPast(data.past);
        setIsAuthenticated(true);
        setError(null);
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setIsAuthenticated(false);
        } else {
          setError("Failed to fetch meetings.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    // Backend initiates Google OAuth and redirects back
    const serverRoot = (import.meta as any).env?.VITE_SERVER_ROOT || "";
    window.location.href = `${serverRoot}/api/auth/google`;
  };

  const handleLogout = async () => {
    await axios.get("/api/auth/logout");
    window.location.reload();
  };

  const handleSummarize = async (meeting: Meeting) => {
    if (summaries[meeting.id]) return;
    try {
      const res = await summarizeMeeting(meeting);
      setSummaries((s) => ({ ...s, [meeting.id]: res.summary }));
    } catch (e) {
      setSummaries((s) => ({ ...s, [meeting.id]: "Summary failed" }));
    }
  };

  if (loading) return <div className="text-center py-8">Loading meetings…</div>;

  if (isAuthenticated === false) {
    return (
      <div className="text-center py-8">
        <p className="mb-4">You are not signed in.</p>
        <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded">
          Sign in with Google
        </button>
      </div>
    );
  }

  if (error) return <div className="text-red-600 text-center py-6">{error}</div>;

  return (
    <div className="space-y-10">
      <div className="flex justify-end gap-3">
        <button className="px-3 py-1 rounded border" onClick={handleLogout}>Logout</button>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Upcoming Meetings</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-600">No upcoming meetings.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Past Meetings</h2>
        {past.length === 0 ? (
          <p className="text-gray-600">No past meetings.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((m) => (
              <div key={m.id}>
                <MeetingCard meeting={m} summary={summaries[m.id]} />
                <div className="mt-2">
                  <button
                    className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                    onClick={() => handleSummarize(m)}
                  >
                    {summaries[m.id] ? "Refetch summary" : "Generate summary"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MeetingsList;
