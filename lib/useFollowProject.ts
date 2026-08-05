'use client';

import { arrayRemove, arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type FollowState = {
  isFollowing: boolean;
  followerCount: number;
  toggleFollow: () => Promise<void>;
};

// Same optimistic-toggle-with-effect-resync shape as useCheerJournalEntry —
// isFollowing starts false and is synced once user?.uid resolves, rather
// than computed in a useState lazy initializer that would run before
// useAuth() has a uid to check against.
export function useFollowProject(project: Project): FollowState {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(project.followerCount);
  const hasToggled = useRef(false);

  const uid = user?.uid;
  useEffect(() => {
    if (hasToggled.current) return;
    setIsFollowing(Boolean(uid && project.followerUids?.includes(uid)));
  }, [project, uid]);

  async function toggleFollow(): Promise<void> {
    if (!user) return;
    hasToggled.current = true;
    const next = !isFollowing;

    setIsFollowing(next);
    setFollowerCount((count) => count + (next ? 1 : -1));

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        followerUids: next ? arrayUnion(user.uid) : arrayRemove(user.uid),
        followerCount: increment(next ? 1 : -1),
      });
    } catch (error) {
      setIsFollowing(!next);
      setFollowerCount((count) => count + (next ? -1 : 1));
      throw error;
    }
  }

  return { isFollowing, followerCount, toggleFollow };
}
