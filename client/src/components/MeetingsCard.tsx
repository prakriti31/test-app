// src/components/MeetingCard.tsx
import React from "react";
import { Meeting } from "../api/calendar";
import { differenceInMinutes, format } from "date-fns";

interface Props {
  meeting: Meeting;
  summary?: string;
}

const MeetingCard: React.FC<Props> = ({ meeting, summary }) => {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  const durationMin = differenceInMinutes(end, start);

  return (
    <article className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white">
      <header className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{meeting.title}</h3>
        <div className="text-sm text-gray-500">{format(start, "MMM d, yyyy h:mm a")}</div>
      </header>

      <div className="mt-2 text-sm text-gray-700">
        <div><span className="font-medium">Duration:</span> {durationMin} minutes</div>
        <div><span className="font-medium">Attendees:</span> {meeting.attendees.join(", ")}</div>
        {meeting.location && <div><span className="font-medium">Location:</span> {meeting.location}</div>}
        {meeting.description && <p className="mt-2 text-sm text-gray-600">{meeting.description}</p>}
      </div>

      {summary && (
        <footer className="mt-3 text-sm italic text-gray-600">
          <div className="font-medium">AI Summary:</div>
          <div>{summary}</div>
        </footer>
      )}
    </article>
  );
};

export default MeetingCard;
