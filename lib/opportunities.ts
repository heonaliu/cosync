import type { Opportunity } from '@/lib/types';

// True whether the poster explicitly marked this 'passed', or its deadline
// has simply elapsed and nobody updated the status field — a rolling-style
// listing can go stale with no status change at all, so checking the date
// too catches what the status field alone would miss.
export function isOpportunityOver(opportunity: Pick<Opportunity, 'status' | 'deadline'>): boolean {
  return opportunity.status === 'passed' || (opportunity.deadline !== undefined && opportunity.deadline < Date.now());
}

// Passed opportunities sink to the end of any list rather than being hidden
// — someone might still want to see what happened, it's just no longer the
// point of the list. Relies on Array#sort being stable (guaranteed since
// ES2019): wrapping an already-sorted array only regroups by passed/not,
// it never disturbs ordering within either group.
export function sortPassedLast<T extends Pick<Opportunity, 'status'>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aPassed = a.status === 'passed';
    const bPassed = b.status === 'passed';
    if (aPassed === bPassed) return 0;
    return aPassed ? 1 : -1;
  });
}
