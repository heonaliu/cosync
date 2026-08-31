import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
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
  cheerCount: number;
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
      cheerCount: entryData.cheerCount ?? 0,
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
    cheerCount: discussionData.cheerCount ?? 0,
    commentCount: discussionData.replyCount ?? 0,
    backHref: `/clubs/${ref.clubId}`,
    backLabel: (clubSnap.data().name as string | undefined) ?? 'the club',
  };
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
    createdAt: toMillis(data.createdAt),
  };
}

export async function listComments(ref: ThreadRef): Promise<Comment[]> {
  const snapshot = await getDocs(query(commentsCollection(ref), orderBy('createdAt', 'asc')));
  return snapshot.docs.map((docSnap) => commentFromDoc(docSnap.id, docSnap.data()));
}

export type NewComment = {
  authorUid: string;
  authorName: string;
  content: string;
  mentionedUids: string[];
  parentCommentId?: string;
  parentCommentAuthorName?: string;
};

// Posts a comment/reply at a pre-generated doc ref (see
// CommentComposer.tsx — the ref is created up front so an image upload has
// somewhere to live before the comment doc itself is written), then bumps
// the parent post's comment/reply count.
export async function postComment(
  ref: ThreadRef,
  commentRef: DocumentReference<DocumentData>,
  comment: NewComment
): Promise<void> {
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
  }

  await setDoc(commentRef, payload);
  await updateDoc(postDocRef(ref), { [commentCountField(ref)]: increment(1) });
}
