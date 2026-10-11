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
  writeBatch,
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
    preview: typeof data.preview === 'string' && data.preview ? data.preview : undefined,
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

// Fired once notifications have been marked seen, so Nav's avatar badge
// (which lives across page changes and otherwise only fetches on load)
// clears right away — see useUnseenNotificationCount.
export const NOTIFICATIONS_SEEN_EVENT = 'cosync:notifications-seen';

export async function markNotificationsSeen(uid: string, notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  notificationIds.forEach((id) => batch.update(doc(db, 'notifications', uid, 'items', id), { seen: true }));
  await batch.commit();
  window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT));
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

// Backs both @mentions and "someone replied to your comment/post" —
// sourceRef is the thread's encoded postId (see lib/thread.ts's
// encodeThreadId) so the notification can link straight to
// /thread/{sourceRef}. Never notifies someone about their own action; see
// lib/thread.ts's postComment for the actual dedupe logic (a reply that's
// also an @mention of the same person only notifies them once).
export async function sendThreadNotification(params: {
  kind: 'mention' | 'reply';
  toUid: string;
  actorUid: string;
  actorName: string;
  threadId: string;
  /** Plain-text excerpt of the comment itself — see lib/mentions.ts's
   * toPlainExcerpt. */
  preview: string;
}): Promise<void> {
  if (params.toUid === params.actorUid) return;
  await addDoc(collection(db, 'notifications', params.toUid, 'items'), {
    kind: params.kind,
    actorUid: params.actorUid,
    actorName: params.actorName,
    sourceRef: params.threadId,
    sourceLabel: params.kind === 'mention' ? 'mentioned you in a reply' : 'replied to you',
    preview: params.preview,
    seen: false,
    createdAt: serverTimestamp(),
  });
}

// "X started following you." The doc id is fixed per follower
// (`follow_{actorUid}`) so repeatedly unfollowing and re-following can't
// spam someone's inbox: the create rule allows writing a new doc into
// another person's notifications, but a second setDoc onto an id that
// already exists is an update, which only the recipient may do — so that
// write is simply denied and the caller swallows it. sourceRef is the
// follower's uid, which the inbox links to as their profile.
export async function sendFollowNotification(params: {
  toUid: string;
  actorUid: string;
  actorName: string;
}): Promise<void> {
  if (params.toUid === params.actorUid) return;
  await setDoc(doc(db, 'notifications', params.toUid, 'items', `follow_${params.actorUid}`), {
    kind: 'follow',
    actorUid: params.actorUid,
    actorName: params.actorName,
    sourceRef: params.actorUid,
    sourceLabel: 'started following you',
    seen: false,
    createdAt: serverTimestamp(),
  });
}
