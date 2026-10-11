'use client';

import { arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { redeemClubInvite } from '@/lib/clubInvites';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type JoinClubState = {
  /** Pass the `?invite=` code when joining an invite-only club. */
  join: (inviteCode?: string) => Promise<void>;
  isJoining: boolean;
};

// Shared by JoinableClubCard (Piece 1's Discover grid) and ClubHeader's
// "+ Join club" button (Piece 3) — same write, two entry points.
export function useJoinClub(clubId: string): JoinClubState {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  async function join(inviteCode?: string): Promise<void> {
    if (!user) return;
    setIsJoining(true);
    try {
      // Has to land before the membership write — firestore.rules only
      // lets someone into an invite-only club once their redemption exists.
      if (inviteCode) await redeemClubInvite(clubId, user.uid, inviteCode);
      await updateDoc(doc(db, 'clubs', clubId), {
        memberUids: arrayUnion(user.uid),
        memberCount: increment(1),
      });
    } finally {
      setIsJoining(false);
    }
  }

  return { join, isJoining };
}
