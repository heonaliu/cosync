import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { toMillis } from '@/lib/queries';
import type { Notification } from '@/lib/types';

function notificationFromDoc(docSnap: QueryDocumentSnapshot<DocumentData>): Notification {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    kind: data.kind ?? 'projectInvite',
    actorUid: data.actorUid ?? '',
    actorName: data.actorName ?? 'Someone',
    sourceRef: data.sourceRef ?? '',
    sourceLabel: data.sourceLabel ?? '',
    seen: Boolean(data.seen),
    createdAt: toMillis(data.createdAt),
  };
}

export async function getNotifications(uid: string): Promise<Notification[]> {
  const snapshot = await getDocs(
    query(collection(db, 'notifications', uid, 'items'), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(notificationFromDoc);
}

// Only what Nav's avatar-dot badge needs — a count aggregation is cheaper
// than fetching every notification just to check whether any are unseen.
export async function getUnseenNotificationCount(uid: string): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, 'notifications', uid, 'items'), where('seen', '==', false))
  );
  return snapshot.data().count;
}

export async function markNotificationSeen(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', uid, 'items', notificationId), { seen: true });
}

// Sends a project collaboration invite: an owner-initiated doc at
// projects/{projectId}/invites/{inviteeUid} (the id-is-the-person pattern,
// same as JoinRequest but for the opposite direction — inviter asks, not
// requester), plus a notification so the invitee actually finds out. Two
// separate writes rather than one, since they're two different documents a
// viewer reads in two different contexts (the project's own invite list,
// vs. the invitee's notification inbox) — CLAUDE.md's "denormalize where
// reads dominate" calls for exactly this instead of trying to derive one
// from the other at read time.
export async function sendProjectInvite(params: {
  projectId: string;
  projectTitle: string;
  inviterUid: string;
  inviterName: string;
  inviteeUid: string;
}): Promise<void> {
  const { projectId, projectTitle, inviterUid, inviterName, inviteeUid } = params;

  await setDoc(doc(db, 'projects', projectId, 'invites', inviteeUid), {
    inviteeUid,
    inviterUid,
    inviterName,
    projectId,
    projectTitle,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications', inviteeUid, 'items'), {
    kind: 'projectInvite',
    actorUid: inviterUid,
    actorName: inviterName,
    sourceRef: projectId,
    sourceLabel: projectTitle,
    seen: false,
    createdAt: serverTimestamp(),
  });
}

// Accepting adds the invitee to memberUids themselves (see firestore.rules'
// projects update carve-out — allowed only because a matching invite doc
// exists for them), then cleans up both the invite and the notification
// that led here, same "doc's mere existence means pending, resolving
// deletes it" pattern as joinRequests.
export async function acceptProjectInvite(params: {
  projectId: string;
  uid: string;
  notificationId: string;
}): Promise<void> {
  const { projectId, uid, notificationId } = params;
  await updateDoc(doc(db, 'projects', projectId), { memberUids: arrayUnion(uid) });
  await deleteDoc(doc(db, 'projects', projectId, 'invites', uid));
  await deleteDoc(doc(db, 'notifications', uid, 'items', notificationId));
}

export async function declineProjectInvite(params: {
  projectId: string;
  uid: string;
  notificationId: string;
}): Promise<void> {
  const { projectId, uid, notificationId } = params;
  await deleteDoc(doc(db, 'projects', projectId, 'invites', uid));
  await deleteDoc(doc(db, 'notifications', uid, 'items', notificationId));
}
