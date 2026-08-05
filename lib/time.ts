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

export function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// Shared by ClubEventCard (the amber spotlight card) and DiscussionCard
// (the same event shown as a regular list entry) so the date/room/host line
// reads identically in both places.
export function formatEventDetailLine(params: {
  eventDate?: number;
  eventLocation?: string;
  eventHost?: string;
  recurring?: boolean;
}): string {
  const parts: string[] = [];

  if (params.eventDate !== undefined) {
    if (params.recurring) {
      const weekday = new Date(params.eventDate).toLocaleDateString('en-US', { weekday: 'long' });
      const time = new Date(params.eventDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      parts.push(`Every ${weekday} at ${time}`);
    } else {
      parts.push(formatEventDate(params.eventDate));
    }
  }

  if (params.eventLocation) parts.push(params.eventLocation);
  if (params.eventHost) parts.push(`${params.eventHost} hosting`);

  return parts.join(' · ');
}
