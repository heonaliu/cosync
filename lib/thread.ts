import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { updateLandingFeedExcerpt } from '@/lib/landingFeed';
import { toPlainExcerpt } from '@/lib/mentions';
import { sendThreadNotification } from '@/lib/notifications';
import { getUserInfo, toMillis } from '@/lib/queries';
import type { Comment } from '@/lib/types';

// A single dynamic route (app/thread/[postId]/page.tsx) has to serve two
// different kinds of post — a project's journal entry, or a club's
// discussion — each of which only exists at a path that also needs its
// parent id (projects/{projectId}/journalEntries/{entryId}, clubs/{clubId}/
// discussions/{discussionId}). ThreadRef packs both ids into one opaque
// route param instead of adding a second dynamic segment or a top-level
// "posts" collection CLAUDE.md's data model doesn't define. The `_`
// separator is safe because Firestore auto-ids are base62
// ([A-Za-z0-9]{20}) and never contain one.
export type ThreadRef =
  | { kind: 'journal'; projectId: string; entryId: string }
  | { kind: 'discussion'; clubId: string; discussionId: string };

export function encodeThreadId(ref: ThreadRef): string {
  return ref.kind === 'journal'
    ? `journal_${ref.projectId}_${ref.entryId}`
    : `discussion_${ref.clubId}_${ref.discussionId}`;
}

export function decodeThreadId(id: string): ThreadRef | null {
  const parts = id.split('_');
  if (parts.length !== 3) return null;
  const [kind, parentId, postId] = parts;
  if (kind === 'journal') return { kind: 'journal', projectId: parentId, entryId: postId };
  if (kind === 'discussion') return { kind: 'discussion', clubId: parentId, discussionId: postId };
  return null;
}

export type ThreadData = {
  ref: ThreadRef;
  title?: string;
  authorUid: string;
  authorName: string;
  content: string;
  createdAt: number;
  editedAt?: number;
  cheerCount: number;
  cheeredByUids: string[];
  commentCount: number;
  backHref: string;
  backLabel: string;
};

function postDocRef(ref: ThreadRef): DocumentReference<DocumentData> {
  return ref.kind === 'journal'
    ? doc(db, 'projects', ref.projectId, 'journalEntries', ref.entryId)
    : doc(db, 'clubs', ref.clubId, 'discussions', ref.discussionId);
}

// The field name that tracks "how many comments" differs per post kind
// (commentCount on journal entries, replyCount on discussions — both
// pre-existing fields from before threading had its own page) — comment
// posting bumps whichever one applies.
function commentCountField(ref: ThreadRef): 'commentCount' | 'replyCount' {
  return ref.kind === 'journal' ? 'commentCount' : 'replyCount';
}

export function commentsCollection(ref: ThreadRef): CollectionReference<DocumentData> {
  return ref.kind === 'journal'
    ? collection(db, 'projects', ref.projectId, 'journalEntries', ref.entryId, 'comments')
    : collection(db, 'clubs', ref.clubId, 'discussions', ref.discussionId, 'replies');
}

// Loads the post itself (as the thread page's header/subject) plus enough
// of its parent (project title / club name) to link back and to label the
// page. Returns null if the post or its parent doesn't exist, or isn't
// visible to the caller (a denied read throws, which the caller catches
// into this same null state — see ProjectDetail/ClubDetail for the same
// pattern).
export async function getThreadData(threadId: string): Promise<ThreadData | null> {
  const ref = decodeThreadId(threadId);
  if (!ref) return null;

  if (ref.kind === 'journal') {
    const [entrySnap, projectSnap] = await Promise.all([
      getDoc(postDocRef(ref)),
      getDoc(doc(db, 'projects', ref.projectId)),
    ]);
    if (!entrySnap.exists() || !projectSnap.exists()) return null;
    const entryData = entrySnap.data();
    const author = await getUserInfo(entryData.authorUid ?? '');
    return {
      ref,
      authorUid: entryData.authorUid ?? '',
      authorName: author.name,
      content: entryData.content ?? '',
      createdAt: toMillis(entryData.createdAt),
      editedAt: entryData.editedAt ? toMillis(entryData.editedAt) : undefined,
      cheerCount: entryData.cheerCount ?? 0,
      cheeredByUids: Array.isArray(entryData.cheeredByUids) ? entryData.cheeredByUids : [],
      commentCount: entryData.commentCount ?? 0,
      backHref: `/projects/${ref.projectId}`,
      backLabel: (projectSnap.data().title as string | undefined) ?? 'the project',
    };
  }

  const [discussionSnap, clubSnap] = await Promise.all([
    getDoc(postDocRef(ref)),
    getDoc(doc(db, 'clubs', ref.clubId)),
  ]);
  if (!discussionSnap.exists() || !clubSnap.exists()) return null;
  const discussionData = discussionSnap.data();
  const author = await getUserInfo(discussionData.authorUid ?? '');
  return {
    ref,
    title: discussionData.title ?? '',
    authorUid: discussionData.authorUid ?? '',
    authorName: author.name,
    content: discussionData.content ?? '',
    createdAt: toMillis(discussionData.createdAt),
    editedAt: discussionData.editedAt ? toMillis(discussionData.editedAt) : undefined,
    cheerCount: discussionData.cheerCount ?? 0,
    cheeredByUids: Array.isArray(discussionData.cheeredByUids) ? discussionData.cheeredByUids : [],
    commentCount: discussionData.replyCount ?? 0,
    backHref: `/clubs/${ref.clubId}`,
    backLabel: (clubSnap.data().name as string | undefined) ?? 'the club',
  };
}

// Cheering your own post is allowed — there's no author-exclusion here,
// unlike the old JournalEntryCard behavior this replaces. Same optimistic-
// toggle field pair every other cheer button in this app uses.
export async function toggleThreadCheer(ref: ThreadRef, uid: string, nextCheered: boolean): Promise<void> {
  await updateDoc(postDocRef(ref), {
    cheeredByUids: nextCheered ? arrayUnion(uid) : arrayRemove(uid),
    cheerCount: increment(nextCheered ? 1 : -1),
  });
}

// Author-only edit of the post itself (see firestore.rules — the author
// already has full write on their own journalEntry/discussion doc, so this
// needs no new rule). editedAt is set on every edit and never cleared,
// which is what ThreadView's "(edited)" label keys off.
export async function updateThreadPost(ref: ThreadRef, edit: { content: string; title?: string }): Promise<void> {
  const payload: Record<string, unknown> = { content: edit.content, editedAt: serverTimestamp() };
  if (ref.kind === 'discussion' && edit.title !== undefined) payload.title = edit.title;
  await updateDoc(postDocRef(ref), payload);
  // Keep the landing page's copy in step. Fails harmlessly when this entry
  // was never in the landing feed (non-public project).
  if (ref.kind === 'journal') updateLandingFeedExcerpt(ref.entryId, edit.content).catch(() => undefined);
}

function commentFromDoc(id: string, data: DocumentData): Comment {
  return {
    id,
    authorUid: data.authorUid ?? '',
    authorName: data.authorName ?? 'Someone',
    content: data.content ?? '',
    mentionedUids: Array.isArray(data.mentionedUids) ? data.mentionedUids : undefined,
    parentCommentId: data.parentCommentId,
    parentCommentAuthorName: data.parentCommentAuthorName,
    parentCommentAuthorUid: data.parentCommentAuthorUid,
    deleted: data.deleted === true ? true : undefined,
    createdAt: toMillis(data.createdAt),
  };
}

export async function listComments(ref: ThreadRef): Promise<Comment[]> {
  const snapshot = await getDocs(query(commentsCollection(ref), orderBy('createdAt', 'asc')));
  return snapshot.docs.map((docSnap) => commentFromDoc(docSnap.id, docSnap.data()));
}

// Soft delete: the author's own update (firestore.rules already allows the
// author full write on their comment). Deleting the doc outright would
// orphan any replies pointing at it via parentCommentId and break their
// "Replying to @X" context, so the doc stays and only its text goes —
// mentionedUids too, since the mention no longer exists anywhere visible.
// The parent's comment count is left alone: the placeholder still occupies
// a spot in the thread.
export async function deleteComment(ref: ThreadRef, commentId: string): Promise<void> {
  await updateDoc(doc(commentsCollection(ref), commentId), {
    content: '',
    deleted: true,
    mentionedUids: deleteField(),
    deletedAt: serverTimestamp(),
  });
}

export type NewComment = {
  authorUid: string;
  authorName: string;
  content: string;
  mentionedUids: string[];
  parentCommentId?: string;
  parentCommentAuthorName?: string;
  parentCommentAuthorUid?: string;
  /** The thread's own post author — always known by the caller (ThreadView
   * already has it via getThreadData). Used to notify the post's author
   * when a comment replies to the post itself, not to another comment. */
  postAuthorUid: string;
};

// Posts a comment/reply, then bumps the parent post's comment/reply count.
export async function postComment(ref: ThreadRef, comment: NewComment): Promise<void> {
  const payload: Record<string, unknown> = {
    authorUid: comment.authorUid,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: serverTimestamp(),
  };
  if (comment.mentionedUids.length > 0) payload.mentionedUids = comment.mentionedUids;
  if (comment.parentCommentId) {
    payload.parentCommentId = comment.parentCommentId;
    payload.parentCommentAuthorName = comment.parentCommentAuthorName;
    payload.parentCommentAuthorUid = comment.parentCommentAuthorUid;
  }

  await addDoc(commentsCollection(ref), payload);
  await updateDoc(postDocRef(ref), { [commentCountField(ref)]: increment(1) });

  // Best-effort — a failed notification write shouldn't undo or error out
  // a comment that already posted successfully. Whoever this comment is
  // directly replying to (a specific comment's author, or the post's own
  // author when there's no parent comment) gets a 'reply' notification;
  // everyone else @mentioned gets a 'mention' one. notifiedUids stops the
  // same person getting pinged twice — e.g. replying to someone AND
  // @mentioning them in the same comment is one notification, not two.
  const threadId = encodeThreadId(ref);
  const preview = toPlainExcerpt(comment.content);
  const notifiedUids = new Set<string>([comment.authorUid]);
  const sends: Promise<void>[] = [];

  const replyToUid = comment.parentCommentAuthorUid ?? comment.postAuthorUid;
  if (!notifiedUids.has(replyToUid)) {
    notifiedUids.add(replyToUid);
    sends.push(
      sendThreadNotification({
        kind: 'reply',
        toUid: replyToUid,
        actorUid: comment.authorUid,
        actorName: comment.authorName,
        threadId,
        preview,
      })
    );
  }

  for (const uid of comment.mentionedUids) {
    if (notifiedUids.has(uid)) continue;
    notifiedUids.add(uid);
    sends.push(
      sendThreadNotification({ kind: 'mention', toUid: uid, actorUid: comment.authorUid, actorName: comment.authorName, threadId, preview })
    );
  }

  await Promise.allSettled(sends);
}
