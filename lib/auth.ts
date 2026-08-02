import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
