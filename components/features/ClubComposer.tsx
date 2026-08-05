'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

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

type FormState = {
  title: string;
  content: string;
  eventDay: string;
  eventTime: string;
  recurring: boolean;
  eventLocation: string;
  eventHost: string;
};

function emptyForm(club: Club): FormState {
  return {
    title: '',
    content: '',
    eventDay: '',
    eventTime: '',
    recurring: false,
    eventLocation: '',
    // Defaults to the club's advisor, since they're the one adult contact
    // a club has on record — still freely editable, e.g. for a
    // student-run session with a different host.
    eventHost: club.advisorName ?? '',
  };
}

// Subject line (title) is required for every post — the single free-text
// field this used to be is now just the optional body, same idea as a
// Reddit-style title + selftext. Picking "Event" swaps that body field out
// for a small structured form instead (day/time/recurring/room/host),
// since an event needs actual data to drive ClubEventCard, not prose.
export function ClubComposer({ club, onPosted }: ClubComposerProps) {
  const { user } = useAuth();
  const [kind, setKind] = useState<DiscussionKind>('discussion');
  const [form, setForm] = useState<FormState>(() => emptyForm(club));
  const [isPosting, setIsPosting] = useState(false);
  const { bg } = accentClasses(club.colorName);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const canSubmit =
    form.title.trim().length > 0 && (kind !== 'event' || (form.eventDay && form.eventTime));

  async function handlePost(): Promise<void> {
    if (!user || !canSubmit) return;
    setIsPosting(true);
    try {
      const payload: Record<string, unknown> = {
        authorUid: user.uid,
        title: form.title.trim(),
        content: kind === 'event' ? '' : form.content.trim(),
        kind,
        replyCount: 0,
        cheerCount: 0,
        createdAt: serverTimestamp(),
      };

      if (kind === 'event') {
        payload.eventDate = new Date(`${form.eventDay}T${form.eventTime}`);
        payload.recurring = form.recurring;
        if (form.eventLocation.trim()) payload.eventLocation = form.eventLocation.trim();
        if (form.eventHost.trim()) payload.eventHost = form.eventHost.trim();
      }

      await addDoc(collection(db, 'clubs', club.id, 'discussions'), payload);

      setForm(emptyForm(club));
      setKind('discussion');
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
        value={form.title}
        onChange={(event) => updateField('title', event.target.value)}
        placeholder={kind === 'event' ? 'Event name' : 'Subject'}
        aria-label="Subject"
      />

      {kind === 'event' ? (
        <div className="flex flex-col gap-3 rounded-card bg-white p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="event-day" className="text-xs text-oak">
                Day
              </label>
              <Input
                id="event-day"
                type="date"
                value={form.eventDay}
                onChange={(event) => updateField('eventDay', event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="event-time" className="text-xs text-oak">
                Time
              </label>
              <Input
                id="event-time"
                type="time"
                value={form.eventTime}
                onChange={(event) => updateField('eventTime', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="event-room" className="text-xs text-oak">
                Room
              </label>
              <Input
                id="event-room"
                placeholder="e.g. Room 217"
                value={form.eventLocation}
                onChange={(event) => updateField('eventLocation', event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="event-host" className="text-xs text-oak">
                Hosted by
              </label>
              <Input
                id="event-host"
                placeholder="e.g. Ms. Reyes"
                value={form.eventHost}
                onChange={(event) => updateField('eventHost', event.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(event) => updateField('recurring', event.target.checked)}
              className="size-4 accent-fresh"
            />
            Recurring weekly
          </label>
        </div>
      ) : (
        <Input
          value={form.content}
          onChange={(event) => updateField('content', event.target.value)}
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
