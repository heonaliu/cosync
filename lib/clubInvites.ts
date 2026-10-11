import { arrayUnion, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

// Invite-only clubs ('invite' access) are hidden from Discover and Related,
// and so are school-only clubs from anyone outside that school. Getting into
// either takes a join code that only the club's admins can read:
//
//   clubs/{clubId}/private/invite           { code }    — admin read/write only
//   clubCodes/{code}                        { clubId }  — get-by-code only, so
//                                                         a typed code can find
//                                                         its club (never listable)
//   clubs/{clubId}/inviteRedemptions/{uid}  { code }    — written by the joiner
//
// The redemption's create rule checks its code against the private doc
// (rules can get() a doc the caller can't read themselves), and the club's
// join carve-out requires a redemption to exist unless the club is open to
// that person. So the code (typed, or inside an invite link) is the only way
// in, even for someone writing to Firestore directly. See firestore.rules.

// No 0/O or 1/I, so a code read aloud or off a whiteboard can't be mistyped.
// 32 symbols divides 256 evenly, so every symbol is equally likely.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const SHORT_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** "abcd-efgh " → "ABCDEFGH". */
export function normalizeClubCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Created lazily the first time an admin opens the code or copies the link,
// so clubs made before this existed work too. Clubs still holding an older
// long-form code get a new short one (old invite links stop working).
export async function getOrCreateClubInviteCode(clubId: string): Promise<string> {
  const ref = doc(db, 'clubs', clubId, 'private', 'invite');
  const snapshot = await getDoc(ref);
  const existing = snapshot.data()?.code;
  if (typeof existing === 'string' && SHORT_CODE.test(existing)) {
    // Self-heal: the lookup doc is a second write and can be missing (e.g.
    // its create was rejected before the clubCodes rule was published),
    // which leaves a code that shows here but can't be typed in.
    await ensureClubCodeLookup(clubId, existing);
    return existing;
  }

  const code = randomCode();
  // Private doc first — the clubCodes create rule checks against it.
  await setDoc(ref, { code, createdAt: serverTimestamp() });
  await ensureClubCodeLookup(clubId, code);
  return code;
}

// Create-only on purpose (the rule allows no updates), so check first.
async function ensureClubCodeLookup(clubId: string, code: string): Promise<void> {
  const lookupRef = doc(db, 'clubCodes', code);
  if ((await getDoc(lookupRef)).exists()) return;
  await setDoc(lookupRef, { clubId, createdAt: serverTimestamp() });
}

export function buildClubInviteUrl(clubId: string, code: string): string {
  return `${window.location.origin}/clubs/${clubId}?invite=${encodeURIComponent(code)}`;
}

export async function redeemClubInvite(clubId: string, uid: string, code: string): Promise<void> {
  await setDoc(doc(db, 'clubs', clubId, 'inviteRedemptions', uid), { code, createdAt: serverTimestamp() });
}

// The "Join club via code" flow. Returns the club's id (so the caller can
// open it), or null when the code doesn't match any club.
export async function joinClubByCode(uid: string, rawCode: string): Promise<string | null> {
  const code = normalizeClubCode(rawCode);
  if (!SHORT_CODE.test(code)) return null;

  const codeSnap = await getDoc(doc(db, 'clubCodes', code));
  const clubId = codeSnap.data()?.clubId;
  if (typeof clubId !== 'string') return null;

  const clubSnap = await getDoc(doc(db, 'clubs', clubId));
  if (!clubSnap.exists()) return null;
  const memberUids: unknown = clubSnap.data().memberUids;
  if (Array.isArray(memberUids) && memberUids.includes(uid)) return clubId; // already in

  await redeemClubInvite(clubId, uid, code);
  await updateDoc(doc(db, 'clubs', clubId), { memberUids: arrayUnion(uid), memberCount: increment(1) });
  return clubId;
}
