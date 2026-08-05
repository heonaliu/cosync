'use client';

import { useEffect, useState } from 'react';

import { AddOpportunityDialog } from '@/components/features/AddOpportunityDialog';
import { FeaturedOpportunityCard } from '@/components/features/FeaturedOpportunityCard';
import { OpportunityListingCard } from '@/components/features/OpportunityListingCard';
import { PillToggle } from '@/components/ui/PillToggle';
import { getAllOpportunities } from '@/lib/queries';
import type { Opportunity, OpportunityType } from '@/lib/types';

const CATEGORIES: { label: string; value: OpportunityType | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Research', value: 'research' },
  { label: 'Hackathons', value: 'hackathon' },
  { label: 'Competitions', value: 'competition' },
  { label: 'Mentorships', value: 'mentorship' },
  { label: 'Programs', value: 'program' },
];

// Ascending by deadline, opportunities with no deadline sink to the end
// instead of being excluded (which is what Firestore's own orderBy would do).
function sortByDeadline(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities].sort((a, b) => {
    if (a.deadline === undefined && b.deadline === undefined) return 0;
    if (a.deadline === undefined) return 1;
    if (b.deadline === undefined) return -1;
    return a.deadline - b.deadline;
  });
}

export function OpportunitiesBoard() {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<OpportunityType | 'All'>('All');
  const [reloadToken, setReloadToken] = useState(0);

  // Fetched client-side, not from the page's Server Component — the
  // opportunities read rule requires request.auth != null, which only the
  // browser's session can satisfy. reloadToken is bumped by
  // AddOpportunityDialog after a successful post, to refetch the list.
  useEffect(() => {
    let cancelled = false;

    getAllOpportunities()
      .then((result) => {
        if (!cancelled) setOpportunities(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load opportunities:', error);
        if (!cancelled) setLoadError('Could not load opportunities right now.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const all = opportunities ?? [];

  // The featured opportunity is a fixed spotlight, not part of the
  // filterable list — it stays visible no matter which category pill is
  // selected below it.
  const featured = all.find((opportunity) => opportunity.featured);

  const rest = sortByDeadline(
    all
      .filter((opportunity) => opportunity.id !== featured?.id)
      .filter((opportunity) => category === 'All' || opportunity.type === category)
  );

  return (
    <div className="flex flex-col gap-6">
      <AddOpportunityDialog onCreated={() => setReloadToken((token) => token + 1)} />

      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Category filters" className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <PillToggle
              key={item.value}
              label={item.label}
              isActive={category === item.value}
              activeColor="purple"
              onClick={() => setCategory(item.value)}
            />
          ))}
        </div>
        <p className="text-xs text-sand">Sort: soonest deadline</p>
      </div>

      {loadError && <p className="text-sm text-sand">{loadError}</p>}
      {!opportunities && !loadError && <p className="text-sm text-sand">Loading opportunities…</p>}

      {featured && <FeaturedOpportunityCard opportunity={featured} />}

      {opportunities && rest.length === 0 && (
        <p className="text-sm text-oak">
          {category === 'All' ? 'Nothing else here yet.' : 'No opportunities match this filter yet.'}
        </p>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-4">
          {rest.map((opportunity) => (
            <OpportunityListingCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </div>
  );
}
