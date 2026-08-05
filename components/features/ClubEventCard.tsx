'use client';

import { IconCalendarEvent, IconPencil, IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

import { EditEventDialog } from '@/components/features/EditEventDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/firebase';
import { formatEventDetailLine } from '@/lib/time';
import type { Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useRsvp } from '@/lib/useRsvp';

type ClubEventCardProps = {
  event: Discussion;
  isMember: boolean;
  onChanged: () => void;
};

// Same amber card for both states — label and buttons vary, matching
// "Upcoming event" (member, with RSVP buttons) vs "Next cohort starts"
// (non-member, informational only) from the screenshots. Edit/delete only
// render for the event's own author — firestore.rules is the actual
// backstop, this is just keeping the buttons out of everyone else's way.
export function ClubEventCard({ event, isMember, onChanged }: ClubEventCardProps) {
  const { user } = useAuth();
  const { status, goingCount, interestedCount, setStatus } = useRsvp(event);
  const isAuthor = user?.uid === event.authorUid;
  const detailLine = formatEventDetailLine(event);

  async function handleRsvp(next: 'going' | 'interested'): Promise<void> {
    try {
      await setStatus(status === next ? null : next);
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      toast.error('Could not update your RSVP. Try again.');
    }
  }

  async function handleDelete(): Promise<void> {
    await deleteDoc(doc(db, 'clubs', event.clubId, 'discussions', event.id));
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-amber p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-deep-amber">
          <IconCalendarEvent className="size-4" aria-hidden="true" />
          {isMember ? 'Upcoming event' : 'Next cohort starts'}
        </div>

        {isAuthor && (
          <div className="flex items-center gap-1">
            <EditEventDialog
              event={event}
              onSaved={onChanged}
              onDeleted={onChanged}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit event"
                  className="text-deep-amber hover:bg-white/40 hover:text-deep-amber"
                >
                  <IconPencil className="size-4" />
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete event"
                  className="text-deep-amber hover:bg-white/40 hover:text-deep-amber"
                >
                  <IconTrash className="size-4" />
                </Button>
              }
              title="Delete this event?"
              description="This can't be undone."
              confirmLabel="Delete"
              onConfirm={handleDelete}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {event.title && <h3 className="text-sm font-medium text-ink">{event.title}</h3>}
        {detailLine && <p className="text-sm text-oak">{detailLine}</p>}
      </div>

      {isMember && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={status === 'going' ? 'dark' : 'outline'}
              size="sm"
              onClick={() => void handleRsvp('going')}
            >
              Going
            </Button>
            <Button
              type="button"
              variant={status === 'interested' ? 'dark' : 'outline'}
              size="sm"
              onClick={() => void handleRsvp('interested')}
            >
              Interested
            </Button>
          </div>
          <span className="text-sm text-oak">
            {goingCount} going · {interestedCount} interested
          </span>
        </div>
      )}
    </div>
  );
}
