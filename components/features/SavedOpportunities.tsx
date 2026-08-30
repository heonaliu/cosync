'use client';

import { useEffect, useState } from 'react';

import { OpportunityListingCard } from '@/components/features/OpportunityListingCard';
import { sortPassedLast } from '@/lib/opportunities';
import { getSavedOpportunities } from '@/lib/queries';
import type { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

export function SavedOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getSavedOpportunities(user.uid)
      .then((result) => {
        if (!cancelled) setOpportunities(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load saved opportunities:', error);
        if (!cancelled) setOpportunities([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || opportunities === null) {
    return <p className="text-sm text-sand">Loading your saved opportunities…</p>;
  }

  if (opportunities.length === 0) {
    return (
      <p className="text-sm text-oak">
        Nothing saved yet — tap Save on an opportunity to keep it here.
      </p>
    );
  }

  function handleRemoved(opportunityId: string): void {
    setOpportunities((previous) => previous?.filter((item) => item.id !== opportunityId) ?? previous);
  }

  function handleUpdated(updated: Opportunity): void {
    setOpportunities((previous) => previous?.map((item) => (item.id === updated.id ? updated : item)) ?? previous);
  }

  return (
    <div className="flex flex-col gap-4">
      {sortPassedLast(opportunities).map((opportunity) => (
        <OpportunityListingCard
          key={opportunity.id}
          opportunity={opportunity}
          onDeleted={handleRemoved}
          onUnsaved={handleRemoved}
          onUpdated={handleUpdated}
        />
      ))}
    </div>
  );
}
