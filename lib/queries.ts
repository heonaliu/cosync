import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { JournalEntry, Opportunity, Project, ProjectWithStats } from '@/lib/types';

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis();
  }
  return typeof value === 'number' ? value : Date.now();
}

function projectFromDoc(docSnap: QueryDocumentSnapshot<DocumentData>): Project {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ownerUid: data.ownerUid ?? '',
    title: data.title ?? 'Untitled project',
    pitch: data.pitch ?? '',
    description: data.description ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    stage: data.stage ?? 'idea',
    visibility: data.visibility ?? 'public',
    lookingFor: data.lookingFor,
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    followerCount: data.followerCount ?? 0,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

async function getUserInfo(uid: string): Promise<{ name: string; verified: boolean }> {
  if (!uid) return { name: 'Someone', verified: false };
  const snapshot = await getDoc(doc(db, 'users', uid));
  const data = snapshot.data();
  return {
    name: (data?.displayName as string | undefined) ?? (data?.handle as string | undefined) ?? 'Someone',
    verified: Boolean(data?.verified),
  };
}

// Public projects only — matches the security rule that lets anyone read
// visibility == 'public' projects without needing membership.
export async function getPublicProjects(count: number): Promise<Project[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'projects'),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(count)
    )
  );
  return snapshot.docs.map(projectFromDoc);
}

// Discover shows every public project (no page-size cap the way the Home
// teaser has one), plus a per-project journal-entry count for the "X people
// · Y entries" line. getCountFromServer is an aggregation query — it counts
// server-side without downloading the entries themselves.
export async function getDiscoverProjects(): Promise<ProjectWithStats[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'))
  );
  const projects = snapshot.docs.map(projectFromDoc);

  return Promise.all(
    projects.map(async (project) => {
      const countSnapshot = await getCountFromServer(
        collection(db, 'projects', project.id, 'journalEntries')
      ).catch(() => null);
      return { ...project, journalEntryCount: countSnapshot?.data().count ?? 0 };
    })
  );
}

// Accepts a plain DocumentSnapshot (not just QueryDocumentSnapshot) so it
// also works for one-off getDoc() lookups — used by getSavedOpportunities,
// where each saved opportunity is fetched individually by id rather than
// coming back as query results. Returns null if the doc doesn't exist
// (e.g. a saved opportunity that was later deleted).
async function opportunityFromDoc(docSnap: DocumentSnapshot<DocumentData>): Promise<Opportunity | null> {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const posterUid: string = data.posterUid ?? '';
  const poster = await getUserInfo(posterUid);
  return {
    id: docSnap.id,
    posterUid,
    posterName: poster.name,
    posterVerified: poster.verified,
    type: data.type ?? 'program',
    title: data.title ?? 'Untitled opportunity',
    description: data.description ?? '',
    deadline: data.deadline ? toMillis(data.deadline) : undefined,
    location: data.location,
    lat: typeof data.lat === 'number' ? data.lat : undefined,
    lng: typeof data.lng === 'number' ? data.lng : undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    applicationUrl: data.applicationUrl,
    verified: Boolean(data.verified),
    featured: Boolean(data.featured),
    createdAt: toMillis(data.createdAt),
  } satisfies Opportunity;
}

function isOpportunity(value: Opportunity | null): value is Opportunity {
  return value !== null;
}

export async function getOpenOpportunities(count: number): Promise<Opportunity[]> {
  const snapshot = await getDocs(
    query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(count))
  );
  const opportunities = await Promise.all(snapshot.docs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
}

// Opportunities directory (app/opportunities): every opportunity, no cap.
// Deliberately not ordered by deadline here — Firestore's orderBy silently
// drops documents missing the ordered field, which would hide any
// no-deadline opportunity instead of just sorting it last. The
// deadline-ascending-nulls-last sort happens in memory in OpportunitiesBoard.
export async function getAllOpportunities(): Promise<Opportunity[]> {
  const snapshot = await getDocs(query(collection(db, 'opportunities'), orderBy('createdAt', 'desc')));
  const opportunities = await Promise.all(snapshot.docs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
}

// Saved opportunities (app/saved): users/{uid}/savedOpportunities is a
// subcollection, so this is just "list everything under my own path" — no
// `where` filter needed, the path itself already scopes it to this user.
// The doc id IS the opportunityId (see useSavedOpportunity.ts), so no
// separate field lookup is needed to know what to fetch next.
export async function getSavedOpportunities(uid: string): Promise<Opportunity[]> {
  const saveSnapshot = await getDocs(collection(db, 'users', uid, 'savedOpportunities'));
  const opportunityIds = saveSnapshot.docs.map((docSnap) => docSnap.id);

  const opportunityDocs = await Promise.all(
    opportunityIds.map((opportunityId) => getDoc(doc(db, 'opportunities', opportunityId)))
  );
  const opportunities = await Promise.all(opportunityDocs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
}

// collectionGroup reaches every project's journalEntries subcollection in one
// query. Firestore will throw a "requires an index" error with a console
// link the first time this runs against a real project — that's expected,
// not a bug; follow the link once and it won't happen again.
export async function getRecentJournalEntries(count: number): Promise<JournalEntry[]> {
  const snapshot = await getDocs(
    query(collectionGroup(db, 'journalEntries'), orderBy('createdAt', 'desc'), limit(count))
  );
  return Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const projectRef = docSnap.ref.parent.parent;
      const projectSnap = projectRef ? await getDoc(projectRef) : null;
      const authorUid: string = data.authorUid ?? '';
      const author = await getUserInfo(authorUid);
      return {
        id: docSnap.id,
        projectId: projectRef?.id ?? '',
        projectTitle: (projectSnap?.data()?.title as string | undefined) ?? 'a project',
        authorUid,
        authorName: author.name,
        content: data.content ?? '',
        cheerCount: data.cheerCount ?? 0,
        commentCount: data.commentCount ?? 0,
        createdAt: toMillis(data.createdAt),
      } satisfies JournalEntry;
    })
  );
}
