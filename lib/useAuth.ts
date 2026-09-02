'use client';

import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth, db } from '@/lib/firebase';

export type AuthStatus = 'loading' | 'anon' | 'authed';

export type AuthState = {
  user: User | null;
  status: AuthStatus;
};

// Module-level, not component state — useAuth() is called from many
// components at once (Nav, every dialog, every page), each mounting its own
// onAuthStateChanged listener, so without this guard the same sign-in would
// trigger one redundant merge write per mounted component instead of one.
const syncedUids = new Set<string>();

// The users/{uid} doc otherwise never learns a person's name or photo —
// every content doc (projects, opportunities, discussions) denormalizes
// user.displayName straight from the live Firebase Auth object at creation
// time, but that never touches users/{uid} itself. A profile page needs to
// look up ANY uid, not just the signed-in one, so it has to come from
// Firestore — this is what puts it there.
function syncProfile(user: User): void {
  if (syncedUids.has(user.uid)) return;
  syncedUids.add(user.uid);

  setDoc(
    doc(db, 'users', user.uid),
    {
      displayName: user.displayName ?? null,
      // Lowercased so @mention search (a case-sensitive Firestore range
      // query — see lib/queries.ts's searchUsersByPrefix) can match
      // regardless of how the searcher capitalizes what they type.
      displayNameLower: user.displayName?.toLowerCase() ?? null,
      // Exact-match only (see lib/queries.ts's findUserByEmail and the
      // invite-by-email feature) — deliberately not a prefix-searchable
      // field the way displayNameLower is. This is the only place a raw
      // email address enters Firestore at all; a project owner can look up
      // one exact address to invite them, never browse/enumerate others'.
      emailLower: user.email?.toLowerCase() ?? null,
      photoURL: user.photoURL ?? null,
    },
    { merge: true }
  ).catch((error: unknown) => {
    syncedUids.delete(user.uid);
    console.error('Failed to sync profile:', error);
  });
}

// 'loading' exists so Nav and redirect guards can wait for Firebase to check
// persisted sign-in before deciding what to show — without it, every page
// load would flash "signed out" for a moment even for a returning user.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, status: 'loading' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setState({ user: nextUser, status: nextUser ? 'authed' : 'anon' });
      if (nextUser) syncProfile(nextUser);
    });
    return unsubscribe;
  }, []);

  return state;
}
