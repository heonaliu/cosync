import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

// Invite-only clubs ('invite' access) are hidden from Discover and Related,
// and joining one takes a secret code that only the club's admins can read:
//
//   clubs/{clubId}/private/invite           { code }  — admin read/write only
//   clubs/{clubId}/inviteRedemptions/{uid}  { code }  — written by the joiner
//
// The redemption's create rule checks its code against the private doc
// (rules can get() a doc the caller can't read themselves), and the club's
// join carve-out requires a redemption to exist for an invite-only club. So
// the link is the only way in, even for someone writing to Firestore
// directly. See firestore.rules.

function randomCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Created lazily the first time an admin copies the link, so clubs made
// before this existed (or switched to invite-only later) work too.
export async function getOrCreateClubInviteCode(clubId: string): Promise<string> {
  const ref = doc(db, 'clubs', clubId, 'private', 'invite');
  const snapshot = await getDoc(ref);
  const existing = snapshot.data()?.code;
  if (typeof existing === 'string' && existing) return existing;

  const code = randomCode();
  await setDoc(ref, { code, createdAt: serverTimestamp() });
  return code;
}

export function buildClubInviteUrl(clubId: string, code: string): string {
  return `${window.location.origin}/clubs/${clubId}?invite=${encodeURIComponent(code)}`;
}

export async function redeemClubInvite(clubId: string, uid: string, code: string): Promise<void> {
  await setDoc(doc(db, 'clubs', clubId, 'inviteRedemptions', uid), { code, createdAt: serverTimestamp() });
}
