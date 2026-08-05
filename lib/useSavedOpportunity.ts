'use client';

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type SavedOpportunityState = {
  isSaved: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
};

// The doc id is `${uid}_${opportunityId}` (same composite-id pattern as the
// follows/{followerUid}_{followedUid} collection), so "is this saved" is a
// single getDoc by id — no query/index needed just to check one card.
export function useSavedOpportunity(opportunityId: string): SavedOpportunityState {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const saveId = user ? `${user.uid}_${opportunityId}` : null;

  useEffect(() => {
    if (!saveId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'savedOpportunities', saveId))
      .then((snapshot) => {
        if (!cancelled) setIsSaved(snapshot.exists());
      })
      .catch((error: unknown) => {
        console.error('Failed to check saved state:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [saveId]);

  async function toggle(): Promise<void> {
    if (!user || !saveId) return;

    if (isSaved) {
      await deleteDoc(doc(db, 'savedOpportunities', saveId));
      setIsSaved(false);
    } else {
      await setDoc(doc(db, 'savedOpportunities', saveId), {
        uid: user.uid,
        opportunityId,
        createdAt: serverTimestamp(),
      });
      setIsSaved(true);
    }
  }

  return { isSaved, isLoading, toggle };
}
