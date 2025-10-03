export interface Meeting {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  attendees: string[];
  description?: string;
  location?: string;
}
