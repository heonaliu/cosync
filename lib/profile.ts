// "Heona Liu" -> "Heona L." Computed from the full display name every time
// it's rendered, not stored separately — there's exactly one source of
// truth (the Google account name, synced onto users/{uid}.displayName by
// useAuth), so a later name change never leaves a stale short form behind
// anywhere it's shown.
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${first} ${lastInitial}.`;
}
