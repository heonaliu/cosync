'use client';

import { useState } from 'react';

import { cn, truncateText } from '@/lib/utils';

type ExpandableTextProps = {
  text: string;
  maxLength?: number;
  className?: string;
};

// Long plain text on a page where it's the only place to read it (a
// project's or club's own page, a profile bio): the first ~maxLength
// characters with a "Show more" toggle, instead of a hard cut that would
// make the rest unreachable. Expanded, the author's line breaks are kept.
export function ExpandableText({ text, maxLength = 150, className }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const preview = truncateText(text, maxLength);
  const isLong = preview !== text.replace(/\s+/g, ' ').trim();

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <p className={cn('text-sm text-oak', isExpanded && 'whitespace-pre-wrap')}>{isExpanded ? text : preview}</p>
      {isLong && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="rounded-pill text-sm font-medium text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
