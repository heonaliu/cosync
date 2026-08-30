'use client';

import { useEffect, useState } from 'react';

import { AddOpportunityDialog } from '@/components/features/AddOpportunityDialog';
import { FeaturedOpportunityCard } from '@/components/features/FeaturedOpportunityCard';
import { LocationField, type SavedLocation } from '@/components/features/LocationField';
import { OpportunityListingCard } from '@/components/features/OpportunityListingCard';
import { PillToggle } from '@/components/ui/PillToggle';
import { getDistanceMiles, RADIUS_OPTIONS_MILES } from '@/lib/location';
import { getAllOpportunities, getUserInfo } from '@/lib/queries';
import type { Opportunity, OpportunityType } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

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

function isRemoteOpportunity(opportunity: Opportunity): boolean {
  return opportunity.location?.trim().toLowerCase() === 'remote';
}

export function OpportunitiesBoard() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<OpportunityType | 'All'>('All');
  const [reloadToken, setReloadToken] = useState(0);

  // Same "Online" / "In-person" / mile-radius model as Home's Nearby tab —
  // see lib/location.ts and LocationField for why the viewer's own
  // point is a city-level geocode rather than a precise address.
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [userLocationLat, setUserLocationLat] = useState<number | null>(null);
  const [userLocationLng, setUserLocationLng] = useState<number | null>(null);
  const [onlineSelected, setOnlineSelected] = useState(false);
  const [inPersonSelected, setInPersonSelected] = useState(false);
  const [selectedRadii, setSelectedRadii] = useState<Set<number>>(new Set());

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

  // Separate from the opportunities fetch above — this is the viewer's own
  // profile, unrelated to reloadToken, and only needed once per sign-in.
  useEffect(() => {
    if (!user) return;
    getUserInfo(user.uid)
      .then((info) => {
        setUserLocation(info.location);
        setUserLocationLat(info.locationLat);
        setUserLocationLng(info.locationLng);
      })
      .catch((error: unknown) => console.error('Failed to load your location:', error));
  }, [user]);

  function handleDeleted(opportunityId: string): void {
    setOpportunities((previous) => previous?.filter((item) => item.id !== opportunityId) ?? previous);
  }

  function handleUpdated(updated: Opportunity): void {
    setOpportunities((previous) => previous?.map((item) => (item.id === updated.id ? updated : item)) ?? previous);
  }

  function handleLocationSaved(result: SavedLocation): void {
    setUserLocation(result.location);
    setUserLocationLat(result.lat);
    setUserLocationLng(result.lng);
  }

  function toggleRadius(radius: number): void {
    setSelectedRadii((previous) => {
      const next = new Set(previous);
      if (next.has(radius)) next.delete(radius);
      else next.add(radius);
      return next;
    });
  }

  const all = opportunities ?? [];

  // The featured opportunity is a fixed spotlight, not part of the
  // filterable list — it stays visible no matter which pill is selected
  // below it.
  const featured = all.find((opportunity) => opportunity.featured);

  const hasLocationFilters = onlineSelected || inPersonSelected || selectedRadii.size > 0;
  const maxRadius = selectedRadii.size > 0 ? Math.max(...selectedRadii) : null;

  function matchesLocationFilter(opportunity: Opportunity): boolean {
    if (!hasLocationFilters) return true;

    if (isRemoteOpportunity(opportunity)) return onlineSelected;

    // Not remote — this is an "in-person" opportunity. Selecting a radius
    // implies wanting in-person results too, even if the In-person pill
    // itself was never explicitly clicked.
    if (!inPersonSelected && maxRadius === null) return false;
    if (maxRadius === null) return true;

    if (userLocationLat === null || userLocationLng === null) return false;
    if (opportunity.lat === undefined || opportunity.lng === undefined) return false;
    return getDistanceMiles(userLocationLat, userLocationLng, opportunity.lat, opportunity.lng) <= maxRadius;
  }

  const rest = sortByDeadline(
    all
      .filter((opportunity) => opportunity.id !== featured?.id)
      .filter((opportunity) => category === 'All' || opportunity.type === category)
      .filter(matchesLocationFilter)
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

      <div className="flex flex-col gap-3 rounded-card bg-white p-4">
        <span className="text-sm font-medium text-ink">Location</span>
        <LocationField currentLocation={userLocation} onSaved={handleLocationSaved} />

        <div role="group" aria-label="Online or in-person" className="flex flex-wrap gap-2">
          <PillToggle label="Online" isActive={onlineSelected} onClick={() => setOnlineSelected((v) => !v)} />
          <PillToggle
            label="In-person"
            isActive={inPersonSelected}
            onClick={() => setInPersonSelected((v) => !v)}
          />
        </div>

        <div role="group" aria-label="Distance filters" className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS_MILES.map((radius) => (
            <PillToggle
              key={radius}
              label={`Within ${radius} miles`}
              isActive={selectedRadii.has(radius)}
              onClick={() => toggleRadius(radius)}
            />
          ))}
        </div>

        {maxRadius !== null && !userLocation && (
          <p className="text-xs text-sand">Add your location above so distance filters have something to measure from.</p>
        )}
      </div>

      {loadError && <p className="text-sm text-sand">{loadError}</p>}
      {!opportunities && !loadError && <p className="text-sm text-sand">Loading opportunities…</p>}

      {featured && (
        <FeaturedOpportunityCard opportunity={featured} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      )}

      {opportunities && rest.length === 0 && (
        <p className="text-sm text-oak">
          {category === 'All' && !hasLocationFilters
            ? 'Nothing else here yet.'
            : 'No opportunities match these filters yet.'}
        </p>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-4">
          {rest.map((opportunity) => (
            <OpportunityListingCard
              key={opportunity.id}
              opportunity={opportunity}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
