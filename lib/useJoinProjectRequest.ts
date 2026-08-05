'use client';

import { arrayUnion, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { getOwnJoinRequest } from '@/lib/queries';
import { useAuth } from '@/lib/useAuth';

type AskToJoinState = {
  /** undefined while the initial check is still in flight. */
  hasRequested: boolean | undefined;
  ask: () => Promise<void>;
};

// The viewer-side "Ask to join" button. Doc id under joinRequests IS the
// requester's uid, so "have I already asked" is a direct getDoc rather than
// a query, and re-clicking after a page reload correctly shows "Requested"
// instead of letting someone file a second request.
export function useAskToJoinProject(projectId: string): AskToJoinState {
  const { user } = useAuth();
  const [hasRequested, setHasRequested] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getOwnJoinRequest(projectId, user.uid)
      .then((request) => {
        if (!cancelled) setHasRequested(request !== null);
      })
      .catch((error: unknown) => console.error('Failed to check join request:', error));
    return () => {
      cancelled = true;
    };
  }, [projectId, user]);

  async function ask(): Promise<void> {
    if (!user) return;
    setHasRequested(true);
    try {
      await setDoc(doc(db, 'projects', projectId, 'joinRequests', user.uid), {
        uid: user.uid,
        name: user.displayName ?? 'Someone',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      setHasRequested(false);
      throw error;
    }
  }

  return { hasRequested, ask };
}

// The owner's Accept/Decline actions. Both delete the joinRequests doc
// rather than updating its status to 'accepted'/'declined' — see
// firestore.rules for the reasoning (the doc's mere existence already means
// "pending"; keeping resolved requests around forever would need extra
// query filtering everywhere and would block someone from ever asking again
// after a decline, since the doc id is their uid).
export function useResolveJoinRequest(projectId: string): {
  accept: (uid: string) => Promise<void>;
  decline: (uid: string) => Promise<void>;
} {
  async function accept(uid: string): Promise<void> {
    await updateDoc(doc(db, 'projects', projectId), { memberUids: arrayUnion(uid) });
    await deleteDoc(doc(db, 'projects', projectId, 'joinRequests', uid));
  }

  async function decline(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'projects', projectId, 'joinRequests', uid));
  }

  return { accept, decline };
}
