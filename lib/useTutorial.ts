'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { useAuth, type AuthStatus } from '@/lib/useAuth';

type TutorialState = {
  status: AuthStatus;
  /** null while the users/{uid} doc is still loading. */
  hasSeenTutorial: boolean | null;
  markSeen: () => Promise<void>;
};

// Backs the floating help button's auto-open-once-for-new-users behavior —
// hasSeenTutorial lives on users/{uid} (not local storage) so it follows a
// person across devices the same way the rest of their profile does.
export function useTutorial(): TutorialState {
  const { user, status } = useAuth();
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snapshot) => {
        if (!cancelled) setHasSeenTutorial(Boolean(snapshot.data()?.hasSeenTutorial));
      })
      .catch((error: unknown) => console.error('Failed to load tutorial state:', error));
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function markSeen(): Promise<void> {
    if (!user) return;
    setHasSeenTutorial(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { hasSeenTutorial: true }, { merge: true });
    } catch (error) {
      console.error('Failed to save tutorial state:', error);
    }
  }

  return { status, hasSeenTutorial, markSeen };
}
