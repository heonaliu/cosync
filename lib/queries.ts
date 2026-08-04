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

export async function getOpenOpportunities(count: number): Promise<Opportunity[]> {
  const snapshot = await getDocs(
    query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(count))
  );
  return Promise.all(
    snapshot.docs.map(async (docSnap) => {
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
        tags: Array.isArray(data.tags) ? data.tags : [],
        applicationUrl: data.applicationUrl,
        verified: Boolean(data.verified),
        createdAt: toMillis(data.createdAt),
      } satisfies Opportunity;
    })
  );
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
