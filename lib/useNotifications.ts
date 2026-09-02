'use client';

import { useEffect, useState } from 'react';

import { getUnseenNotificationCount } from '@/lib/notifications';
import { useAuth } from '@/lib/useAuth';

// Backs the avatar-dot badge in Nav — a count, not the list itself, fetched
// once per session the same "fetch on mount, no live listener" way
// everything else in this app reads Firestore. Won't update mid-session if
// a new invite lands while you're already looking at the page; a reload
// picks it up, same tradeoff as every other count in this app (cheer
// counts, reply counts, etc. don't live-update from other people's actions
// either).
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
    return () => {
      cancelled = true;
    };
  }, [user]);

  return count;
}
