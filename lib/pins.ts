import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type PinnedIds = {
  projectIds: string[];
  opportunityIds: string[];
};

// One doc read covers both — pinnedProjectIds/pinnedOpportunityIds live
// alongside interests on the same users/{uid} doc, same self-write rule.
export async function getPinnedIds(uid: string): Promise<PinnedIds> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  const data = snapshot.data();
  return {
    projectIds: Array.isArray(data?.pinnedProjectIds) ? data.pinnedProjectIds : [],
    opportunityIds: Array.isArray(data?.pinnedOpportunityIds) ? data.pinnedOpportunityIds : [],
  };
}

export async function setProjectPinned(uid: string, projectId: string, pinned: boolean): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { pinnedProjectIds: pinned ? arrayUnion(projectId) : arrayRemove(projectId) },
    { merge: true }
  );
}

export async function setOpportunityPinned(uid: string, opportunityId: string, pinned: boolean): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { pinnedOpportunityIds: pinned ? arrayUnion(opportunityId) : arrayRemove(opportunityId) },
    { merge: true }
  );
}
