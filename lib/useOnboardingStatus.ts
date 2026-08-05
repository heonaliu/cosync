'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

export type OnboardingStatus = 'loading' | 'anon' | 'needed' | 'done';

// Reads users/{uid}/private/profile — see firestore.rules for why survey
// answers live in a separate, owner-only path instead of on the main
// users/{uid} doc. Used by both RequireAuth and RedirectIfSignedIn so
// "have they onboarded" is checked consistently no matter which page a
// signed-in visitor lands on first.
export function useOnboardingStatus(): OnboardingStatus {
  const { user, status } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== 'authed' || !user) {
      setOnboarded(null);
      return;
    }
    let cancelled = false;

    getDoc(doc(db, 'users', user.uid, 'private', 'profile'))
      .then((snapshot) => {
        if (!cancelled) setOnboarded(Boolean(snapshot.data()?.onboardedAt));
      })
      .catch((error: unknown) => {
        console.error('Failed to check onboarding status:', error);
        // Fail open — a transient read error shouldn't trap someone in a
        // redirect loop between /home and /onboarding.
        if (!cancelled) setOnboarded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  if (status === 'loading') return 'loading';
  if (status === 'anon') return 'anon';
  if (onboarded === null) return 'loading';
  return onboarded ? 'done' : 'needed';
}
