'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

const FILTERS = ['For you', 'Following', 'Opportunities', 'Nearby'] as const;

// Visual toggle only — every filter reads the same simple query for now,
// since there's no recommendation/following logic wired up yet.
export function FeedFilterBar() {
  const [active, setActive] = useState<(typeof FILTERS)[number]>('For you');

  return (
    <div role="group" aria-label="Feed filters" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter === active;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActive(filter)}
            className={cn(
              'whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
              isActive ? 'bg-fresh text-white' : 'border border-olive bg-white text-ink hover:bg-cream'
            )}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
