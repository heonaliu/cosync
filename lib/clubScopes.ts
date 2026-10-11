import type { Club, ClubScope } from '@/lib/types';

export const CLUB_SCOPE_OPTIONS: { value: ClubScope; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'inPerson', label: 'In person' },
  { value: 'other', label: 'Other' },
];

export const MAX_CUSTOM_SCOPE_LENGTH = 30;

// 'other' shows whatever the admin wrote in, e.g. "Library, Tuesdays".
export function clubScopeLabel(club: Pick<Club, 'scope' | 'customScope'>): string {
  if (club.scope === 'other') return club.customScope?.trim() || 'Other';
  return CLUB_SCOPE_OPTIONS.find((option) => option.value === club.scope)?.label ?? 'Online';
}

// Older clubs stored 'school' (meets at the creator's school) — that's
// in person now, with the school itself still in schoolName.
export function normalizeClubScope(raw: unknown): ClubScope {
  if (raw === 'school') return 'inPerson';
  return CLUB_SCOPE_OPTIONS.some((option) => option.value === raw) ? (raw as ClubScope) : 'online';
}
