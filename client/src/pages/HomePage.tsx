// src/pages/HomePage.tsx
import React from "react";
import MeetingsList from "../components/MeetingsList";

const HomePage: React.FC = () => {
  return (
    <main className="app-container">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold">Katalyst — Meeting Viewer</h1>
        <p className="mt-2 text-gray-600">Realtime calendar data via Composio MCP + Google OAuth</p>
      </header>

      <MeetingsList />

      <footer className="mt-12 text-center text-sm text-gray-500">
        Backend handles OAuth + MCP + LLM. Do not commit `.env`.
      </footer>
    </main>
  );
};

export default HomePage;
