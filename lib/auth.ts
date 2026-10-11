import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

// Shared across every sign-in button on the page (the landing page has two,
// nav + hero). Firebase allows one popup at a time and cancels the first
// with auth/cancelled-popup-request if another starts — so a second click
// anywhere joins the popup that's already open instead.
let pendingSignIn: Promise<User | null> | null = null;

// The person closing the popup themselves (or a duplicate request that got
// folded into the open one) isn't a failure worth reporting.
const DISMISSED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

/** Resolves to null when the person dismissed the popup. */
export function signInWithGoogle(): Promise<User | null> {
  pendingSignIn ??= signInWithPopup(auth, googleProvider)
    .then((result) => result.user)
    .catch((error: unknown) => {
      if (error instanceof FirebaseError && DISMISSED_CODES.has(error.code)) return null;
      throw error;
    })
    .finally(() => {
      pendingSignIn = null;
    });
  return pendingSignIn;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
