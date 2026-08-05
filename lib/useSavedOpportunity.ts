'use client';

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import type { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type SavedOpportunityState = {
  isSaved: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
};

// users/{uid}/savedOpportunities/{opportunityId} — a subcollection under the
// user's own document, doc id is just the opportunityId. "Is this saved" is
// a single getDoc by a path the owner always has read/write on; "all of my
// saves" (getSavedOpportunities in lib/queries.ts) is listing the whole
// subcollection, no query/index needed either way.
export function useSavedOpportunity(opportunity: Opportunity): SavedOpportunityState {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const saveRef = user ? doc(db, 'users', user.uid, 'savedOpportunities', opportunity.id) : null;

  useEffect(() => {
    if (!saveRef) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(saveRef)
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
    // opportunity.id is already part of saveRef's path; re-deriving it here
    // would just be a roundabout way of depending on the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRef?.path]);

  async function toggle(): Promise<void> {
    if (!saveRef) return;

    // Optimistic: flip the visible state immediately, before Firestore
    // confirms anything. If the write fails, the catch below flips it back
    // — the caller (OpportunityListingCard) is responsible for surfacing
    // that failure (a toast), this hook only owns the state + the revert.
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      if (nextSaved) {
        const payload: Record<string, unknown> = {
          opportunityId: opportunity.id,
          createdAt: serverTimestamp(),
        };
        // Denormalize the address onto the save record now, so /saved can
        // show a map or sort by distance later without re-fetching every
        // linked opportunity — not built yet, just making sure the data's
        // there when it is.
        if (opportunity.location) payload.address = opportunity.location;
        if (opportunity.lat !== undefined) payload.lat = opportunity.lat;
        if (opportunity.lng !== undefined) payload.lng = opportunity.lng;

        await setDoc(saveRef, payload);
      } else {
        await deleteDoc(saveRef);
      }
    } catch (error) {
      setIsSaved(!nextSaved);
      throw error;
    }
  }

  return { isSaved, isLoading, toggle };
}
