// Where to send someone once they've signed in, when they started from
// something specific on the landing page (e.g. a build-journal card) rather
// than the generic "Get started" button. Session-only and same-site paths
// only — never a full URL — so it can't become an open redirect.
const KEY = 'cosync:afterSignIn';

export function setAfterSignInPath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Storage blocked — they'll just land on Home instead.
  }
}

/** Returns the saved path (once) and clears it. */
export function takeAfterSignInPath(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
