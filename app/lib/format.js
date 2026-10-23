// Date, time and queue helpers shared by all screens.

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-01' -> parts, read as a calendar date (no time zone surprises)
export function dateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return { day: DAY[dt.getUTCDay()], date: d, month: MONTH[m - 1], monthUpper: MONTH[m - 1].toUpperCase(), year: y };
}

export const dayLabel = (iso) => {
  const p = dateParts(iso);
  return `${p.day} ${p.date} ${p.month}`;
};

// '18:30' -> { time: '6:30', ampm: 'PM' }
export function time12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${String(m).padStart(2, '0')}`, ampm };
}

export const timeLabel = (hhmm) => {
  const t = time12(hhmm);
  return `${t.time} ${t.ampm}`;
};

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const runtimeLabel = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

// Start of a screening as a real moment in Lagos time
export const screeningStart = (sc) => new Date(`${sc.date}T${sc.time}:00+01:00`);

// Queue label from people in line vs seats left
export function queueLabel(queue) {
  if (!queue) return null;
  const { inLine, seatsLeft } = queue;
  if (seatsLeft <= 0) return { text: 'Full', tone: 'alert' };
  const ratio = inLine / seatsLeft;
  if (ratio < 0.7) return { text: 'Good chance', tone: 'good' };
  if (ratio < 1.2) return { text: 'Tight', tone: 'gold' };
  return { text: 'Unlikely', tone: 'alert' };
}

export const initials = (name) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Google Maps directions for an address (opens the Maps app on phones)
export const directionsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
