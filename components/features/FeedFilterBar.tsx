'use client';

import { useState } from 'react';

import { PillToggle } from '@/components/ui/PillToggle';

const FILTERS = ['For you', 'Following', 'Opportunities', 'Nearby'] as const;

// Visual toggle only — every filter reads the same simple query for now,
// since there's no recommendation/following logic wired up yet.
export function FeedFilterBar() {
  const [active, setActive] = useState<(typeof FILTERS)[number]>('For you');

  return (
    <div role="group" aria-label="Feed filters" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <PillToggle
          key={filter}
          label={filter}
          isActive={filter === active}
          onClick={() => setActive(filter)}
        />
      ))}
    </div>
  );
}
