'use client';

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type FollowUserState = {
  isFollowing: boolean;
  isLoading: boolean;
  toggleFollow: () => Promise<void>;
};

function followDocId(followerUid: string, followedUid: string): string {
  return `${followerUid}_${followedUid}`;
}

// Same optimistic-toggle shape as useFollowProject, but backed by the
// standalone follows/{followerUid}_{followedUid} collection instead of an
// array on the target's own doc — see getFollowerCount in lib/queries.ts
// for why a person can't be followed the array-on-the-target's-doc way a
// project is.
export function useFollowUser(profileUid: string): FollowUserState {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasToggled = useRef(false);

  const viewerUid = user?.uid;

  useEffect(() => {
    if (hasToggled.current) return;
    if (!viewerUid || viewerUid === profileUid) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    getDoc(doc(db, 'follows', followDocId(viewerUid, profileUid)))
      .then((snapshot) => {
        if (!cancelled) setIsFollowing(snapshot.exists());
      })
      .catch((error: unknown) => console.error('Failed to check follow state:', error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewerUid, profileUid]);

  async function toggleFollow(): Promise<void> {
    if (!viewerUid || viewerUid === profileUid) return;
    hasToggled.current = true;
    const next = !isFollowing;
    setIsFollowing(next);

    const ref = doc(db, 'follows', followDocId(viewerUid, profileUid));
    try {
      if (next) {
        await setDoc(ref, { followerUid: viewerUid, followedUid: profileUid, createdAt: serverTimestamp() });
      } else {
        await deleteDoc(ref);
      }
    } catch (error) {
      setIsFollowing(!next);
      throw error;
    }
  }

  return { isFollowing, isLoading, toggleFollow };
}
