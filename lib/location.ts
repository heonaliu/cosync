// Coarse, text-only "is this near me" check — the fallback used when the
// viewer hasn't touched the Nearby tab's distance/online pills yet, so the
// tab isn't empty on first render. Once real coordinates exist (see
// getDistanceMiles below) and a pill is active, HomeFeed switches to real
// distance math instead of this substring match. Remote opportunities always
// count as nearby here, since they're equally reachable no matter where the
// viewer is — once pills are active, "Online" takes over that job explicitly.
export function isNearbyMatch(userLocation: string, opportunityLocation: string | undefined): boolean {
  if (!opportunityLocation) return false;

  const normalizedOpportunity = opportunityLocation.trim().toLowerCase();
  if (normalizedOpportunity === 'remote') return true;

  const normalizedUser = userLocation.trim().toLowerCase();
  if (!normalizedUser) return false;

  return normalizedOpportunity.includes(normalizedUser) || normalizedUser.includes(normalizedOpportunity);
}

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Great-circle (Haversine) distance in miles between two lat/lng points.
// The viewer's own point is deliberately a city-level geocode (LocationField
// restricts its Places Autocomplete to `(cities)`), not a street address —
// CLAUDE.md's safety rules bar storing a user's precise location, and a city
// centroid shared by everyone in that city isn't precise in the way a home
// address would be. Opportunity coordinates, by contrast, are a public venue's
// address (whatever the poster picked), which is a different privacy category
// entirely — that's why only this one point needs to stay coarse.
export function getDistanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export const RADIUS_OPTIONS_MILES = [5, 10, 15, 25] as const;
