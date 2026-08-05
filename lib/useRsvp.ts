'use client';

import { arrayRemove, arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { db } from '@/lib/firebase';
import type { Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

export type RsvpStatus = 'going' | 'interested' | null;

type RsvpState = {
  status: RsvpStatus;
  goingCount: number;
  interestedCount: number;
  setStatus: (next: RsvpStatus) => Promise<void>;
};

function initialStatus(discussion: Discussion, uid: string | undefined): RsvpStatus {
  if (!uid) return null;
  if (discussion.goingUids?.includes(uid)) return 'going';
  if (discussion.interestedUids?.includes(uid)) return 'interested';
  return null;
}

// Going/Interested are mutually exclusive — picking one while the other is
// active moves you, it doesn't double-count. Same optimistic-then-revert
// shape as useCheerDiscussion: flip local state immediately, write in the
// background, undo both on failure.
export function useRsvp(discussion: Discussion): RsvpState {
  const { user } = useAuth();
  const [status, setStatusState] = useState<RsvpStatus>(null);
  const [goingCount, setGoingCount] = useState(discussion.goingCount ?? 0);
  const [interestedCount, setInterestedCount] = useState(discussion.interestedCount ?? 0);
  // useAuth() resolves the signed-in user asynchronously, so on first mount
  // user?.uid is still undefined — this effect re-syncs status once it
  // arrives. hasSetStatus guards against clobbering an optimistic update the
  // user already made in the meantime.
  const hasSetStatus = useRef(false);

  useEffect(() => {
    if (hasSetStatus.current) return;
    setStatusState(initialStatus(discussion, user?.uid));
  }, [discussion, user?.uid]);

  async function setStatus(next: RsvpStatus): Promise<void> {
    if (!user) return;
    hasSetStatus.current = true;
    const previous = status;
    if (next === previous) return;

    const ref = doc(db, 'clubs', discussion.clubId, 'discussions', discussion.id);
    const update: Record<string, unknown> = {};

    // Leaving whichever state you were in before...
    if (previous === 'going') {
      update.goingUids = arrayRemove(user.uid);
      update.goingCount = increment(-1);
    } else if (previous === 'interested') {
      update.interestedUids = arrayRemove(user.uid);
      update.interestedCount = increment(-1);
    }
    // ...and entering the new one, if any (next === null just means "leave").
    if (next === 'going') {
      update.goingUids = arrayUnion(user.uid);
      update.goingCount = increment(1);
    } else if (next === 'interested') {
      update.interestedUids = arrayUnion(user.uid);
      update.interestedCount = increment(1);
    }

    setStatusState(next);
    setGoingCount((count) => count + (next === 'going' ? 1 : 0) - (previous === 'going' ? 1 : 0));
    setInterestedCount((count) => count + (next === 'interested' ? 1 : 0) - (previous === 'interested' ? 1 : 0));

    try {
      await updateDoc(ref, update);
    } catch (error) {
      setStatusState(previous);
      setGoingCount((count) => count - (next === 'going' ? 1 : 0) + (previous === 'going' ? 1 : 0));
      setInterestedCount(
        (count) => count - (next === 'interested' ? 1 : 0) + (previous === 'interested' ? 1 : 0)
      );
      throw error;
    }
  }

  return { status, goingCount, interestedCount, setStatus };
}
