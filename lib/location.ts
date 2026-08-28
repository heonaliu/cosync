// Coarse, text-only "is this near me" check — CLAUDE.md's safety rules bar
// storing a user's precise location, so there's no lat/lng to do real
// distance math with for the *person*, only a loose substring match between
// their self-reported city/area and an opportunity's location string.
// Remote opportunities always count as nearby, since they're equally
// reachable no matter where the viewer is.
export function isNearbyMatch(userLocation: string, opportunityLocation: string | undefined): boolean {
  if (!opportunityLocation) return false;

  const normalizedOpportunity = opportunityLocation.trim().toLowerCase();
  if (normalizedOpportunity === 'remote') return true;

  const normalizedUser = userLocation.trim().toLowerCase();
  if (!normalizedUser) return false;

  return normalizedOpportunity.includes(normalizedUser) || normalizedUser.includes(normalizedOpportunity);
}
