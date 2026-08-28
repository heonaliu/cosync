'use client';

import { PillToggle } from '@/components/ui/PillToggle';

export const FEED_FILTERS = ['For you', 'Following', 'Opportunities', 'Nearby'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

type FeedFilterBarProps = {
  active: FeedFilter;
  onChange: (next: FeedFilter) => void;
};

// Controlled — HomeFeed owns `active` so it can actually filter the feed
// data when a pill is clicked, instead of this toggling a value nothing
// downstream reads.
export function FeedFilterBar({ active, onChange }: FeedFilterBarProps) {
  return (
    <div role="group" aria-label="Feed filters" className="flex flex-wrap gap-2">
      {FEED_FILTERS.map((filter) => (
        <PillToggle key={filter} label={filter} isActive={filter === active} onClick={() => onChange(filter)} />
      ))}
    </div>
  );
}
