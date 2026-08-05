'use client';

import { arrayUnion, doc, increment, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type JoinClubState = {
  join: () => Promise<void>;
  isJoining: boolean;
};

// Shared by JoinableClubCard (Piece 1's Discover grid) and ClubHeader's
// "+ Join club" button (Piece 3) — same write, two entry points.
export function useJoinClub(clubId: string): JoinClubState {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  async function join(): Promise<void> {
    if (!user) return;
    setIsJoining(true);
    try {
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
