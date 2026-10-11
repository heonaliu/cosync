import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { getUserInfo, toMillis } from '@/lib/queries';

// landingFeed/{entryId} — the only CoSync data a signed-out visitor can
// read, so the landing page can show real recent activity. It's a separate,
// deliberately thin copy of a journal entry rather than the entry itself
// being made public: just the author's first name, the project title, and
// a short text-only excerpt. Never photos (uploads aren't moderated yet —
// see CLAUDE.md safety rule 4), never full names or uids of anyone
// @mentioned, never anything from an unlisted/private project.
//
// Kept in sync from the client at each point the source can change:
// posting (ProjectJournalComposer), editing a post (lib/thread.ts),
// deleting a post (JournalEntryCard), renaming a project or making it
// non-public (EditProjectDialog), and deleting a project (ProjectHeader).
// firestore.rules enforces the shape and that it only mirrors a real entry
// on a public project.
const LANDING_FEED = 'landingFeed';
const EXCERPT_MAX_LENGTH = 160;

export type LandingFeedItem = {
  id: string;
  firstName: string;
  projectTitle: string;
  /** Empty for a photo-only update. */
  excerpt: string;
  createdAt: number;
};

const IMAGE_TOKEN = /!\[[^\]]*\]\([^)]+\)/g;
const MENTION_TOKEN = /@\[([^\]]+)\]\([^)]+\)/g;

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) || 'A maker';
}

// Photos dropped entirely, @mentions reduced to a first name only.
function toLandingExcerpt(content: string): string {
  const plain = content
    .replace(IMAGE_TOKEN, ' ')
    .replace(MENTION_TOKEN, (_, name: string) => `@${firstNameOf(name)}`)
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= EXCERPT_MAX_LENGTH) return plain;
  const cut = plain.slice(0, EXCERPT_MAX_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > EXCERPT_MAX_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export async function publishToLandingFeed(params: {
  entryId: string;
  projectId: string;
  projectTitle: string;
  authorUid: string;
  authorName: string;
  content: string;
}): Promise<void> {
  await setDoc(doc(db, LANDING_FEED, params.entryId), {
    authorUid: params.authorUid,
    firstName: firstNameOf(params.authorName),
    projectId: params.projectId,
    projectTitle: params.projectTitle,
    excerpt: toLandingExcerpt(params.content),
    createdAt: serverTimestamp(),
  });
}

// Only touches entries that are already in the feed — an edit to a post on
// a non-public project has nothing here to update, and that failure is
// expected and ignored by callers.
export async function updateLandingFeedExcerpt(entryId: string, content: string): Promise<void> {
  await updateDoc(doc(db, LANDING_FEED, entryId), { excerpt: toLandingExcerpt(content) });
}

export async function removeFromLandingFeed(entryId: string): Promise<void> {
  await deleteDoc(doc(db, LANDING_FEED, entryId));
}

async function getProjectLandingDocs(projectId: string) {
  return getDocs(query(collection(db, LANDING_FEED), where('projectId', '==', projectId)));
}

export async function removeProjectFromLandingFeed(projectId: string): Promise<void> {
  const snapshot = await getProjectLandingDocs(projectId);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

export async function renameProjectInLandingFeed(projectId: string, projectTitle: string): Promise<void> {
  const snapshot = await getProjectLandingDocs(projectId);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.update(docSnap.ref, { projectTitle }));
  await batch.commit();
}

// How many recent docs to look through when picking the strip's cards —
// enough that one very active project or person can't crowd everyone else
// out of the window entirely.
const LANDING_SCAN_COUNT = 60;

// The strip's cards: at most one per project AND one per person — each
// person's single newest update, skipping any project that already has a
// card (so two teammates on one project don't both show it). Newest first.
export async function getLandingFeed(count: number): Promise<LandingFeedItem[]> {
  const snapshot = await getDocs(
    query(collection(db, LANDING_FEED), orderBy('createdAt', 'desc'), limit(LANDING_SCAN_COUNT))
  );

  const newestPerProject = new Map<string, LandingFeedItem & { authorUid: string }>();
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const projectId = typeof data.projectId === 'string' ? data.projectId : docSnap.id;
    if (newestPerProject.has(projectId)) continue; // already have this project's newest
    newestPerProject.set(projectId, {
      id: docSnap.id,
      authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
      firstName: typeof data.firstName === 'string' ? data.firstName : 'A maker',
      projectTitle: typeof data.projectTitle === 'string' ? data.projectTitle : 'a project',
      excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
      createdAt: toMillis(data.createdAt),
    });
  }

  const seenAuthors = new Set<string>();
  const cards: LandingFeedItem[] = [];
  for (const { authorUid, ...item } of newestPerProject.values()) {
    if (seenAuthors.has(authorUid)) continue;
    seenAuthors.add(authorUid);
    cards.push(item);
  }
  return cards.slice(0, count);
}

// Adds this user's own newest updates on public projects that aren't in the
// landing feed yet — so updates posted before the feed existed (or whose
// publish failed) still show up, without anyone running a manual backfill.
// Only ever the caller's own entries: the rules only let an author publish
// their own. Existing docs are skipped, not rewritten (a rewrite would be
// an update, which the rules restrict to the excerpt alone). Returns how
// many were added.
export async function syncOwnLandingFeed(uid: string, maxEntries = 10): Promise<number> {
  const projects = await getDocs(
    query(collection(db, 'projects'), where('memberUids', 'array-contains', uid), where('visibility', '==', 'public'))
  );
  const entries = (
    await Promise.all(
      projects.docs.map(async (projectSnap) => {
        const entrySnaps = await getDocs(
          query(collection(db, 'projects', projectSnap.id, 'journalEntries'), where('authorUid', '==', uid))
        );
        return entrySnaps.docs.map((entrySnap) => ({
          entryId: entrySnap.id,
          projectId: projectSnap.id,
          projectTitle: (projectSnap.data().title as string | undefined) ?? '',
          content: (entrySnap.data().content as string | undefined) ?? '',
          createdAt: toMillis(entrySnap.data().createdAt),
        }));
      })
    )
  )
    .flat()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, maxEntries);
  if (entries.length === 0) return 0;

  const existing = await Promise.all(entries.map((entry) => getDoc(doc(db, LANDING_FEED, entry.entryId))));
  const missing = entries.filter((_, index) => !existing[index].exists());
  if (missing.length === 0) return 0;

  const authorName = (await getUserInfo(uid)).name;
  const results = await Promise.allSettled(
    missing.map((entry) => publishToLandingFeed({ ...entry, authorUid: uid, authorName }))
  );
  return results.filter((result) => result.status === 'fulfilled').length;
}
