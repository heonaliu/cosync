'use client';

import { arrayRemove, arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { db } from '@/lib/firebase';
import type { Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type CheerState = {
  hasCheered: boolean;
  cheerCount: number;
  toggleCheer: () => Promise<void>;
};

// Optimistic toggle, same pattern as useSavedOpportunity: flip the count and
// hasCheered immediately, write in the background, revert both on failure.
export function useCheerDiscussion(discussion: Discussion): CheerState {
  const { user } = useAuth();
  const [hasCheered, setHasCheered] = useState(Boolean(user && discussion.cheeredByUids?.includes(user.uid)));
  const [cheerCount, setCheerCount] = useState(discussion.cheerCount);

  async function toggleCheer(): Promise<void> {
    if (!user) return;
    const ref = doc(db, 'clubs', discussion.clubId, 'discussions', discussion.id);
    const nextCheered = !hasCheered;

    setHasCheered(nextCheered);
    setCheerCount((count) => count + (nextCheered ? 1 : -1));

    try {
      await updateDoc(ref, {
        cheeredByUids: nextCheered ? arrayUnion(user.uid) : arrayRemove(user.uid),
        cheerCount: increment(nextCheered ? 1 : -1),
      });
    } catch (error) {
      setHasCheered(!nextCheered);
      setCheerCount((count) => count + (nextCheered ? -1 : 1));
      throw error;
    }
  }

  return { hasCheered, cheerCount, toggleCheer };
}
