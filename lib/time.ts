export function formatRelativeTime(ms: number): string {
  const diffMs = Date.now() - ms;
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Oxford-comma joiner for a project header's "who's on this" line — e.g.
// ["Heona (owner)", "Alicia"] -> "Heona (owner) and Alicia", or
// ["Sam", "Jai", "Maya"] -> "Sam, Jai, and Maya".
export function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// A bare `new Date('2026-09-27')` parses as UTC midnight, which
// toLocaleDateString then renders as the day before in any timezone behind
// UTC (all of the US) — the exact off-by-one an <input type="date"> value
// hits every time it round-trips through `new Date(string)`. Parsing the
// parts directly and constructing a local-midnight Date sidesteps that.
export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Shared by MyClubCard and ClubHeader so a club's "how active is it" label
// reads the same everywhere it appears, derived from its most recent
// discussion rather than a stored/guessable field.
export function formatClubActivity(lastDiscussionAt: number | undefined): string {
  if (lastDiscussionAt === undefined) return 'quiet lately';
  const hours = (Date.now() - lastDiscussionAt) / (60 * 60 * 1000);
  if (hours < 24) return 'active today';
  if (hours < 24 * 7) return 'active this week';
  return 'quiet lately';
}

export function formatEventDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatWeekdayList(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'day';
  return sorted.map((day) => WEEKDAY_LABELS[day]).join(', ');
}

// Shared by ClubEventCard (the amber spotlight card), UpcomingEventsList,
// and DiscussionCard (the same event shown as a regular list entry) so the
// date/room/host line reads identically everywhere.
export function formatEventDetailLine(params: {
  eventDate?: number;
  eventLocation?: string;
  eventHost?: string;
  recurringDays?: number[];
}): string {
  const parts: string[] = [];

  if (params.eventDate !== undefined) {
    const time = new Date(params.eventDate).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (params.recurringDays && params.recurringDays.length > 0) {
      parts.push(`Every ${formatWeekdayList(params.recurringDays)} at ${time}`);
    } else {
      parts.push(formatEventDate(params.eventDate));
    }
  }

  if (params.eventLocation) parts.push(params.eventLocation);
  if (params.eventHost) parts.push(`${params.eventHost} hosting`);

  return parts.join(' · ');
}

// The next real date/time this event actually happens, whether it's a
// one-time event or a recurring series. Nothing stores this — there's one
// Discussion doc per series, not one per occurrence, so "when's the next
// one" has to be computed from eventDate + recurringDays at render time.
// Returns undefined if the event (one-time) is already in the past.
export function getNextEventOccurrence(discussion: {
  eventDate?: number;
  recurringDays?: number[];
}): number | undefined {
  if (discussion.eventDate === undefined) return undefined;

  if (!discussion.recurringDays || discussion.recurringDays.length === 0) {
    return discussion.eventDate >= Date.now() ? discussion.eventDate : undefined;
  }

  const anchor = new Date(discussion.eventDate);
  const now = new Date();

  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    if (discussion.recurringDays.includes(candidate.getDay()) && candidate.getTime() >= now.getTime()) {
      return candidate.getTime();
    }
  }

  return undefined;
}
