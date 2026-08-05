'use client';

import { IconPencil } from '@tabler/icons-react';

import { EditEventDialog } from '@/components/features/EditEventDialog';
import { Button } from '@/components/ui/button';
import { formatEventDetailLine } from '@/lib/time';
import type { Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type UpcomingEventsListProps = {
  /** Already filtered to upcoming-only and sorted soonest-first, with the
   * spotlighted event (shown in ClubEventCard above this) excluded. */
  events: Discussion[];
  onChanged: () => void;
};

// The single amber card only ever shows the soonest event — this is where
// "see multiple/future events" actually lives: every other upcoming event
// (one-time or recurring), nearest first.
export function UpcomingEventsList({ events, onChanged }: UpcomingEventsListProps) {
  const { user } = useAuth();

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-olive bg-white p-4">
      <h3 className="text-sm font-medium text-ink">More upcoming events</h3>
      <ul className="flex flex-col gap-3">
        {events.map((event) => {
          const isAuthor = user?.uid === event.authorUid;
          return (
            <li key={event.id} className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">{event.title}</span>
                <span className="text-xs text-sand">{formatEventDetailLine(event)}</span>
              </div>
              {isAuthor && (
                <EditEventDialog
                  event={event}
                  onSaved={onChanged}
                  onDeleted={onChanged}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit event">
                      <IconPencil className="size-4 text-sand" />
                    </Button>
                  }
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
