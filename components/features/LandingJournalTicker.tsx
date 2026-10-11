'use client';

import { useEffect, useState } from 'react';

import { GoogleSignInButton } from '@/components/features/GoogleSignInButton';
import { ProjectCover } from '@/components/features/ProjectCover';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setAfterSignInPath } from '@/lib/afterSignIn';
import { accentClasses, accentColorFor } from '@/lib/color';
import { getLandingFeed, type LandingFeedItem } from '@/lib/landingFeed';
import { formatRelativeTime } from '@/lib/time';
import { cn } from '@/lib/utils';

const FEED_COUNT = 12;
// Up to this many cards fit on screen together, so they sit still in a
// grid; only a longer feed scrolls.
const MAX_STATIC_CARDS = 4;
// Slow, constant reading speed — ~304px per card (w-72 + gap-4), so this is
// roughly 30px a second.
const SECONDS_PER_CARD = 10;
// A short feed's pass is padded out to the screen width with empty space
// (never repeated cards), so time the loop as if it had at least this many.
const MIN_CARDS_FOR_TIMING = 5;

type TickerCardProps = {
  item: LandingFeedItem;
  onOpen: (item: LandingFeedItem) => void;
  /** The loop's duplicate pass — kept out of the tab order. */
  isDuplicate?: boolean;
  className?: string;
};

function TickerCard({ item, onOpen, isDuplicate = false, className }: TickerCardProps) {
  return (
    <li className={cn('flex w-72 shrink-0', className)}>
      <button
        type="button"
        tabIndex={isDuplicate ? -1 : undefined}
        onClick={() => onOpen(item)}
        aria-label={`${item.firstName} posted to ${item.projectTitle} — sign in to see it`}
        className="flex w-full flex-col gap-2 overflow-hidden rounded-card bg-white p-4 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
      >
      {/* The project's cover, or a color band of the same size, so every
          card in the strip is the same height. Bleeds to the card's edges. */}
      {item.coverImageUrl ? (
        <ProjectCover
          url={item.coverImageUrl}
          variant="card"
          position={item.coverPosition}
          className="-mx-4 -mt-4 mb-1 w-[calc(100%+2rem)] max-w-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            '-mx-4 -mt-4 mb-1 aspect-[10/3] w-[calc(100%+2rem)] max-w-none',
            accentClasses(accentColorFor(item.projectId)).bg
          )}
        />
      )}
      <div className="flex items-center gap-2">
        <Avatar name={item.firstName} size="sm" decorative />
        <p className="min-w-0 text-sm text-ink">
          <span className="font-medium">{item.firstName}</span>
          <span className="text-oak"> posted to </span>
          <span className="font-medium text-purple">{item.projectTitle}</span>
        </p>
      </div>
      <p className="line-clamp-3 text-sm text-oak">{item.excerpt || 'Shared a new photo of the build.'}</p>
      <span className="mt-auto text-xs text-sand">{formatRelativeTime(item.createdAt)}</span>
      </button>
    </li>
  );
}

// Signed-out landing page: the latest public build-journal updates — first
// name, project, a short excerpt. A few sit still in a grid; more than
// MAX_STATIC_CARDS become a slow, endlessly scrolling strip.
// Reads lib/landingFeed.ts, the one collection open to signed-out visitors.
// Pauses on hover/focus so a card can actually be read, and holds still
// entirely for anyone who's asked their OS for reduced motion.
export function LandingJournalTicker() {
  const [items, setItems] = useState<LandingFeedItem[] | null>(null);
  // The card someone clicked — signed-out visitors are asked to sign in,
  // then taken straight to that project (lib/afterSignIn.ts).
  const [selected, setSelected] = useState<LandingFeedItem | null>(null);

  function handleOpen(item: LandingFeedItem): void {
    setAfterSignInPath(`/projects/${item.projectId}`);
    setSelected(item);
  }

  const signInDialog = (
    <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to see {selected?.projectTitle ?? 'this project'}</DialogTitle>
          <DialogDescription>
            Build journals are only open to CoSync members. Sign in and we&apos;ll take you straight there.
          </DialogDescription>
        </DialogHeader>
        <GoogleSignInButton className="w-full">Continue with Google</GoogleSignInButton>
      </DialogContent>
    </Dialog>
  );

  useEffect(() => {
    let cancelled = false;
    getLandingFeed(FEED_COUNT)
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the landing feed:', error);
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return <p className="text-sm text-sand">Loading the latest builds…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-oak">
        The workbench is quiet right now — sign in and post the first update of the day.
      </p>
    );
  }

  if (items.length <= MAX_STATIC_CARDS) {
    return (
      <>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <TickerCard key={item.id} item={item} onOpen={handleOpen} className="w-auto" />
          ))}
        </ul>
        {signInDialog}
      </>
    );
  }

  return (
    <div
      className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto"
      aria-label="Latest build journal updates"
      role="region"
      tabIndex={0}
    >
      {/* Two identical passes back to back; the animation slides the track
          by exactly one pass (-50%) and restarts, so it never jumps. Each
          pass is at least a full screen wide (blank space after a short
          feed, never repeated cards), so the same person or project is
          never on screen twice at once. */}
      <div
        className="flex w-max animate-marquee py-1 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${Math.max(items.length, MIN_CARDS_FOR_TIMING) * SECONDS_PER_CARD}s` }}
      >
        {[0, 1].map((pass) => (
          <ul
            key={pass}
            // The second pass is only there for the loop — hidden from screen
            // readers (they get the list once) and from reduced-motion users,
            // for whom the strip is a plain scrollable row instead.
            aria-hidden={pass === 1 || undefined}
            className={cn('flex min-w-[100vw] gap-4 pr-4', pass === 1 && 'motion-reduce:hidden')}
          >
            {items.map((item) => (
              <TickerCard key={item.id} item={item} onOpen={handleOpen} isDuplicate={pass === 1} />
            ))}
          </ul>
        ))}
      </div>
      {signInDialog}
    </div>
  );
}
