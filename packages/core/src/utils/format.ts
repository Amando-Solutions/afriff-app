// Date, time and queue helpers shared by all screens.
import type { Queue, QueueLabel } from '../types/festival';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface DateParts {
  day: string;
  date: number;
  month: string;
  monthUpper: string;
  year: number;
}

// '2026-11-01' -> parts, read as a calendar date (no time zone surprises)
export function dateParts(iso: string): DateParts {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const month = MONTH[m - 1] ?? '';
  return { day: DAY[dt.getUTCDay()] ?? '', date: d, month, monthUpper: month.toUpperCase(), year: y };
}

export const dayLabel = (iso: string) => {
  const p = dateParts(iso);
  return `${p.day} ${p.date} ${p.month}`;
};

// '18:30' -> { time: '6:30', ampm: 'PM' }
export function time12(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${String(m).padStart(2, '0')}`, ampm };
}

export const timeLabel = (hhmm: string) => {
  const t = time12(hhmm);
  return `${t.time} ${t.ampm}`;
};

export const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const runtimeLabel = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

// Start of a screening (or event) as a real moment in Lagos time
export const screeningStart = (sc: { date: string; time: string }) => new Date(`${sc.date}T${sc.time}:00+01:00`);

// Queue label from people in line vs seats left
// People in line ÷ seats left: under 0.6 good chance, under 1 filling up,
// otherwise more people than seats.
export function queueLabel(queue: Pick<Queue, 'inLine' | 'seatsLeft'> | null | undefined): QueueLabel | null {
  if (!queue) return null;
  const { inLine, seatsLeft } = queue;
  if (seatsLeft <= 0) return { text: 'Full', tone: 'alert', detail: 'no seats left' };
  const ratio = inLine / seatsLeft;
  if (ratio < 0.6) return { text: 'Good chance of a seat', tone: 'good', detail: '' };
  const spare = seatsLeft - inLine;
  if (ratio < 1) return { text: 'Filling up', tone: 'warn', detail: `${spare} seat${spare === 1 ? '' : 's'} left` };
  const extra = inLine - seatsLeft;
  return {
    text: 'Likely full',
    tone: 'alert',
    detail: extra === 0 ? 'as many people as seats' : `${extra} more ${extra === 1 ? 'person' : 'people'} than seats`,
  };
}

// The queue's bar, out of the seats there were at the door (seatsStart, else
// the screening's capacity): the seats already taken (solid), then the people
// in line who would still fit (faded). Moves with every count: "Let in" turns
// line into taken, a walk-in adds to taken, "Joined" adds to the line.
export function queueBar({ inLine, seatsLeft, seatsStart }: Pick<Queue, 'inLine' | 'seatsLeft' | 'seatsStart'>, capacity = 0) {
  const total = Math.max(seatsStart || capacity, seatsLeft, 1);
  const taken = seatsLeft <= 0 ? total : total - seatsLeft;
  const line = Math.min(inLine, Math.max(0, seatsLeft));
  const pct = (n: number) => Math.round((n / total) * 1000) / 10;
  return { taken: pct(taken), line: pct(line), total };
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Google Maps directions for an address (opens the Maps app on phones)
export const directionsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
