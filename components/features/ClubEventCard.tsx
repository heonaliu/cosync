import { IconCalendarEvent } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { formatEventDate } from '@/lib/time';
import type { Discussion } from '@/lib/types';

type ClubEventCardProps = {
  event: Discussion;
  isMember: boolean;
};

// Same amber card for both states — label and buttons vary, matching
// "Upcoming event" (member, with RSVP buttons) vs "Next cohort starts"
// (non-member, informational only) from the screenshots.
export function ClubEventCard({ event, isMember }: ClubEventCardProps) {
  const detailLine = [
    event.eventDate ? formatEventDate(event.eventDate) : null,
    event.eventLocation,
    event.content,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-3 rounded-card bg-amber p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-deep-amber">
        <IconCalendarEvent className="size-4" aria-hidden="true" />
        {isMember ? 'Upcoming event' : 'Next cohort starts'}
      </div>

      <div className="flex flex-col gap-1">
        {event.title && <h3 className="text-sm font-medium text-ink">{event.title}</h3>}
        {detailLine && <p className="text-sm text-oak">{detailLine}</p>}
      </div>

      {isMember && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="button" variant="dark" size="sm">
              Going
            </Button>
            <Button type="button" variant="outline" size="sm">
              Interested
            </Button>
          </div>
          <span className="text-sm text-oak">
            {event.goingCount ?? 0} going · {event.interestedCount ?? 0} interested
          </span>
        </div>
      )}
    </div>
  );
}
