'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { EventFields, type EventFormValues } from '@/components/features/EventFields';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { accentClasses } from '@/lib/color';
import { db } from '@/lib/firebase';
import type { Club, DiscussionKind } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

type ClubComposerProps = {
  club: Club;
  onPosted: () => void;
};

function emptyEventValues(club: Club): EventFormValues {
  return {
    eventDay: '',
    eventTime: '',
    eventLocation: '',
    // Defaults to the club's advisor, since they're the one adult contact
    // a club has on record — still freely editable, e.g. for a
    // student-run session with a different host.
    eventHost: club.advisorName ?? '',
    recurringDays: [],
  };
}

// Subject line (title) is required for every post — the single free-text
// field this used to be is now just the optional body, same idea as a
// Reddit-style title + selftext. Picking "Event" swaps that body field out
// for EventFields instead, since an event needs actual data to drive
// ClubEventCard, not prose.
export function ClubComposer({ club, onPosted }: ClubComposerProps) {
  const { user } = useAuth();
  const [kind, setKind] = useState<DiscussionKind>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventValues, setEventValues] = useState<EventFormValues>(() => emptyEventValues(club));
  const [isPosting, setIsPosting] = useState(false);
  const { bg } = accentClasses(club.colorName);

  const canSubmit = title.trim().length > 0 && (kind !== 'event' || (eventValues.eventDay && eventValues.eventTime));

  function reset(): void {
    setTitle('');
    setContent('');
    setEventValues(emptyEventValues(club));
    setKind('discussion');
  }

  async function handlePost(): Promise<void> {
    if (!user || !canSubmit) return;
    setIsPosting(true);
    try {
      const payload: Record<string, unknown> = {
        authorUid: user.uid,
        title: title.trim(),
        content: kind === 'event' ? '' : content.trim(),
        kind,
        replyCount: 0,
        cheerCount: 0,
        goingCount: 0,
        interestedCount: 0,
        createdAt: serverTimestamp(),
      };

      if (kind === 'event') {
        payload.eventDate = new Date(`${eventValues.eventDay}T${eventValues.eventTime}`);
        if (eventValues.recurringDays.length > 0) payload.recurringDays = eventValues.recurringDays;
        if (eventValues.eventLocation.trim()) payload.eventLocation = eventValues.eventLocation.trim();
        if (eventValues.eventHost.trim()) payload.eventHost = eventValues.eventHost.trim();
      }

      await addDoc(collection(db, 'clubs', club.id, 'discussions'), payload);

      reset();
      onPosted();
    } catch (error) {
      console.error('Failed to post to club:', error);
      toast.error('Could not post. Try again.');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-card p-5', bg)}>
      <div className="flex items-center gap-2">
        <Avatar name={user?.displayName ?? user?.email ?? 'You'} size="sm" decorative />
        <span className="text-sm font-medium text-ink">Post to the club</span>
      </div>

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={kind === 'event' ? 'Event name' : 'Subject'}
        aria-label="Subject"
      />

      {kind === 'event' ? (
        <EventFields value={eventValues} onChange={setEventValues} />
      ) : (
        <Input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share a build, ask a question, or add more detail (optional)…"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <PillToggle label="Discussion" isActive={kind === 'discussion'} onClick={() => setKind('discussion')} />
          <PillToggle label="Event" isActive={kind === 'event'} onClick={() => setKind('event')} />
        </div>
        <Button type="button" disabled={isPosting || !canSubmit} onClick={() => void handlePost()}>
          {isPosting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
