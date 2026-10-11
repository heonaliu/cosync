'use client';

import { useEffect, useState } from 'react';

import { getUnseenNotificationCount, NOTIFICATIONS_SEEN_EVENT } from '@/lib/notifications';
import { useAuth } from '@/lib/useAuth';

// Backs the avatar-dot badge in Nav — a count, not the list itself, fetched
// once per session the same "fetch on mount, no live listener" way
// everything else in this app reads Firestore. Won't update mid-session if
// a new invite lands while you're already looking at the page; a reload
// picks it up, same tradeoff as every other count in this app (cheer
// counts, reply counts, etc. don't live-update from other people's actions
// either). Your own action is different: opening Notifications marks them
// seen and fires NOTIFICATIONS_SEEN_EVENT, which clears the badge at once.
export function useUnseenNotificationCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUnseenNotificationCount(user.uid)
      .then((result) => {
        if (!cancelled) setCount(result);
      })
      .catch((error: unknown) => console.error('Failed to load notification count:', error));
    const handleSeen = (): void => setCount(0);
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, handleSeen);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, handleSeen);
    };
  }, [user]);

  return count;
}
