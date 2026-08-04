'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export type AuthStatus = 'loading' | 'anon' | 'authed';

export type AuthState = {
  user: User | null;
  status: AuthStatus;
};

// 'loading' exists so Nav and redirect guards can wait for Firebase to check
// persisted sign-in before deciding what to show — without it, every page
// load would flash "signed out" for a moment even for a returning user.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, status: 'loading' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setState({ user: nextUser, status: nextUser ? 'authed' : 'anon' });
    });
    return unsubscribe;
  }, []);

  return state;
}
