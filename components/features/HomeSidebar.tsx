'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import {
  getFollowSuggestions,
  getUpcomingClubEvents,
  type FollowSuggestion,
  type UpcomingClubEvent,
} from '@/lib/queries';
import { encodeThreadId } from '@/lib/thread';
import { useAuth } from '@/lib/useAuth';
import { useFollowUser } from '@/lib/useFollowUser';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EVENT_COUNT = 4;

// "Today 4:00 PM" / "Thu 4:00 PM" inside the coming week, "Oct 24" beyond it.
function formatEventWhen(ms: number): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return `Today ${time}`;
  if (ms - Date.now() < WEEK_MS) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SUGGESTION_COUNT = 5;

// The strongest reason this person is being suggested, or null for someone
// with no connection yet (they show their top interest instead).
function suggestionReason(person: FollowSuggestion): string | null {
  if (person.mutualCount > 0) {
    const [first, second] = person.mutualNames;
    const others = person.mutualCount - person.mutualNames.length;
    if (others > 0) return `Followed by ${first} and ${others} other${others === 1 ? '' : 's'} you follow`;
    return second ? `Followed by ${first} and ${second}` : `Followed by ${first}`;
  }
  if (person.followsYou) return 'Follows you';
  return null;
}

function FollowSuggestionRow({ person }: { person: FollowSuggestion }) {
  const { isFollowing, isLoading, toggleFollow } = useFollowUser(person.uid);
  const detail = suggestionReason(person) ?? person.topInterest;

  async function handleClick(): Promise<void> {
    try {
      await toggleFollow();
    } catch (error) {
      console.error('Failed to follow:', error);
      toast.error('Could not follow that person. Try again.');
    }
  }

  return (
    <li className="flex items-center gap-3">
      <Link href={`/profile/${person.uid}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
        <Avatar name={person.name} photoURL={person.photoURL} size="sm" decorative />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/profile/${person.uid}`} className="truncate text-sm text-ink hover:underline">
          {person.name}
        </Link>
        {detail && <span className="truncate text-xs text-sand">{detail}</span>}
      </div>
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={isLoading}
        onClick={() => void handleClick()}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </li>
  );
}

export function HomeSidebar() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<FollowSuggestion[] | null>(null);
  const [events, setEvents] = useState<UpcomingClubEvent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getUpcomingClubEvents(user.uid)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load upcoming events:', error);
        if (!cancelled) setEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Events inside the next 7 days if there are any; otherwise whatever's
  // next, under a heading that doesn't claim it's this week.
  const thisWeek = (events ?? []).filter((item) => item.nextOccurrence - Date.now() < WEEK_MS);
  const shownEvents = (thisWeek.length > 0 ? thisWeek : (events ?? [])).slice(0, EVENT_COUNT);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getFollowSuggestions(user.uid, SUGGESTION_COUNT)
      .then((result) => {
        if (!cancelled) setSuggestions(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load follow suggestions:', error);
        if (!cancelled) setSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">
          {events && events.length > 0 && thisWeek.length === 0 ? 'Coming up' : 'This week'}
        </h2>
        {events === null ? (
          <p className="text-sm text-sand">Loading…</p>
        ) : shownEvents.length === 0 ? (
          <p className="text-sm text-oak">
            Nothing on the calendar yet. Events your clubs post will show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shownEvents.map(({ event, clubId, clubName, nextOccurrence }) => (
              <li key={event.id}>
                <Link
                  href={`/thread/${encodeThreadId({ kind: 'discussion', clubId, discussionId: event.id })}`}
                  className="flex flex-col rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <span className="text-sm text-ink hover:underline">{event.title || 'Club event'}</span>
                  <span className="text-xs text-sand">
                    {formatEventWhen(nextOccurrence)} · {clubName}
                    {event.goingCount ? ` · ${event.goingCount} going` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">You might follow</h2>
        {suggestions === null ? (
          <p className="text-sm text-sand">Loading…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-oak">
            No one new to suggest right now — check back once more makers join.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestions.map((person) => (
              <FollowSuggestionRow key={person.uid} person={person} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
