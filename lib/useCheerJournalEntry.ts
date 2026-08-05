'use client';

import { arrayRemove, arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { db } from '@/lib/firebase';
import type { JournalEntry } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type CheerState = {
  hasCheered: boolean;
  cheerCount: number;
  toggleCheer: () => Promise<void>;
};

// Same shape as useCheerDiscussion, but the initial hasCheered is synced via
// an effect keyed on user?.uid rather than computed in useState's lazy
// initializer. useAuth() resolves the signed-in user asynchronously — on the
// very first render user is still null, so a lazy initializer would lock
// hasCheered to false forever even after the real uid loads (this exact bug
// was found and fixed in useRsvp.ts; applying the fix here from the start
// rather than reintroducing it in a new hook).
export function useCheerJournalEntry(entry: JournalEntry): CheerState {
  const { user } = useAuth();
  const [hasCheered, setHasCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(entry.cheerCount);
  const hasToggled = useRef(false);

  const uid = user?.uid;
  useEffect(() => {
    if (hasToggled.current) return;
    setHasCheered(Boolean(uid && entry.cheeredByUids?.includes(uid)));
  }, [entry, uid]);

  async function toggleCheer(): Promise<void> {
    if (!user) return;
    hasToggled.current = true;
    const ref = doc(db, 'projects', entry.projectId, 'journalEntries', entry.id);
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
