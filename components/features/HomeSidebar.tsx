'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { getFollowSuggestions, type FollowSuggestion } from '@/lib/queries';
import { useAuth } from '@/lib/useAuth';
import { useFollowUser } from '@/lib/useFollowUser';

// Static placeholder content — there's no events collection in the data
// model yet, so this part of the sidebar is illustrative rather than a real
// Firestore read, unlike "You might follow" below it.
const EVENTS = [
  { name: 'MIT Hackathon', when: 'Sat', going: 42 },
  { name: 'AI club kickoff', when: 'Thu', going: 8 },
];

const SUGGESTION_COUNT = 2;

function FollowSuggestionRow({ person }: { person: FollowSuggestion }) {
  const { isFollowing, isLoading, toggleFollow } = useFollowUser(person.uid);

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
        {person.topInterest && <span className="truncate text-xs text-sand">{person.topInterest}</span>}
      </div>
      <Button
        type="button"
        size="xs"
        variant={isFollowing ? 'outline' : 'default'}
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
        <h2 className="text-sm font-medium text-ink">This week</h2>
        <ul className="flex flex-col gap-3">
          {EVENTS.map((event) => (
            <li key={event.name} className="flex flex-col">
              <span className="text-sm text-ink">{event.name}</span>
              <span className="text-xs text-sand">
                {event.when} · {event.going} going
              </span>
            </li>
          ))}
        </ul>
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
