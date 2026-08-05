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
import type {
  Club,
  ClubAccess,
  ClubIconName,
  ClubScope,
  Discussion,
  DiscussionKind,
  JournalEntry,
  Opportunity,
  Project,
  ProjectWithStats,
} from '@/lib/types';

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

export type UserInfo = { name: string; verified: boolean; role: string | null; school: string | null };

export async function getUserInfo(uid: string): Promise<UserInfo> {
  if (!uid) return { name: 'Someone', verified: false, role: null, school: null };
  const snapshot = await getDoc(doc(db, 'users', uid));
  const data = snapshot.data();
  return {
    name: (data?.displayName as string | undefined) ?? (data?.handle as string | undefined) ?? 'Someone',
    verified: Boolean(data?.verified),
    role: (data?.role as string | undefined) ?? null,
    school: (data?.school as string | undefined) ?? null,
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

async function clubFromDoc(docSnap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Promise<Club | null> {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const advisorUid: string | undefined = data.advisorUid;
  const advisor = advisorUid ? await getUserInfo(advisorUid) : null;
  const memberUids: string[] = Array.isArray(data.memberUids) ? data.memberUids : [];
  return {
    id: docSnap.id,
    name: data.name ?? 'Untitled club',
    description: data.description ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    iconName: (data.iconName as ClubIconName) ?? 'cpu',
    colorName: data.colorName ?? 'sky',
    scope: (data.scope as ClubScope) ?? 'online',
    schoolName: data.schoolName,
    access: (data.access as ClubAccess) ?? 'anyone',
    memberUids,
    adminUids: Array.isArray(data.adminUids) ? data.adminUids : [],
    advisorUid,
    advisorName: advisor?.name,
    memberCount: typeof data.memberCount === 'number' ? data.memberCount : memberUids.length,
    meetsSchedule: data.meetsSchedule,
    cohortSize: data.cohortSize,
    cost: data.cost,
    pinnedResources: Array.isArray(data.pinnedResources) ? data.pinnedResources : undefined,
    whatYoullGet: Array.isArray(data.whatYoullGet) ? data.whatYoullGet : undefined,
    createdAt: toMillis(data.createdAt),
  } satisfies Club;
}

function isClub(value: Club | null): value is Club {
  return value !== null;
}

async function getAllClubs(): Promise<Club[]> {
  const snapshot = await getDocs(collection(db, 'clubs'));
  const clubs = await Promise.all(snapshot.docs.map(clubFromDoc));
  return clubs.filter(isClub);
}

// Clubs this user is already a member of — Firestore can filter this
// server-side since array-contains is a real query operator.
export async function getUserClubs(uid: string): Promise<Club[]> {
  const snapshot = await getDocs(query(collection(db, 'clubs'), where('memberUids', 'array-contains', uid)));
  const clubs = await Promise.all(snapshot.docs.map(clubFromDoc));
  return clubs.filter(isClub);
}

// Clubs this user is NOT in yet. Firestore has no "array does not contain"
// operator, so there's no way to push the exclusion server-side — this
// fetches every club (the clubs read rule already allows any signed-in user
// to read the whole collection) and filters out memberships in memory.
export async function getDiscoverableClubs(uid: string): Promise<Club[]> {
  const clubs = await getAllClubs();
  return clubs.filter((club) => !club.memberUids.includes(uid));
}

// Two other clubs sharing at least one tag with `club`, falling back to any
// other clubs if there's no tag overlap — used by the detail page's
// "Related clubs" sidebar list.
export async function getRelatedClubs(club: Club, count: number): Promise<Club[]> {
  const clubs = (await getAllClubs()).filter((candidate) => candidate.id !== club.id);
  const scored = clubs
    .map((candidate) => ({
      candidate,
      sharedTags: candidate.tags.filter((tag) => club.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.sharedTags - a.sharedTags);
  return scored.slice(0, count).map(({ candidate }) => candidate);
}

export async function getClub(clubId: string): Promise<Club | null> {
  const snapshot = await getDoc(doc(db, 'clubs', clubId));
  return clubFromDoc(snapshot);
}

// Resolves display names for just the first `count` member uids — the
// avatar stack only ever shows a handful of faces plus a "+N" overflow, so
// there's no reason to resolve every member's name to render it.
export async function getClubMemberPreviews(memberUids: string[], count: number): Promise<string[]> {
  const previews = await Promise.all(memberUids.slice(0, count).map((uid) => getUserInfo(uid)));
  return previews.map((preview) => preview.name);
}

async function discussionFromDoc(
  clubId: string,
  club: Club,
  docSnap: QueryDocumentSnapshot<DocumentData>
): Promise<Discussion> {
  const data = docSnap.data();
  const authorUid: string = data.authorUid ?? '';
  const author = await getUserInfo(authorUid);
  const authorIsEducator =
    authorUid === club.advisorUid || author.role === 'educator' || author.role === 'admin';
  return {
    id: docSnap.id,
    clubId,
    authorUid,
    authorName: author.name,
    authorIsEducator,
    title: data.title ?? '',
    content: data.content ?? '',
    kind: (data.kind as DiscussionKind) ?? 'discussion',
    eventDate: data.eventDate ? toMillis(data.eventDate) : undefined,
    eventLocation: data.eventLocation,
    eventHost: data.eventHost,
    recurringDays: Array.isArray(data.recurringDays) ? data.recurringDays : undefined,
    goingCount: typeof data.goingCount === 'number' ? data.goingCount : undefined,
    interestedCount: typeof data.interestedCount === 'number' ? data.interestedCount : undefined,
    goingUids: Array.isArray(data.goingUids) ? data.goingUids : [],
    interestedUids: Array.isArray(data.interestedUids) ? data.interestedUids : [],
    replyCount: data.replyCount ?? 0,
    cheerCount: data.cheerCount ?? 0,
    cheeredByUids: Array.isArray(data.cheeredByUids) ? data.cheeredByUids : [],
    createdAt: toMillis(data.createdAt),
  } satisfies Discussion;
}

// Takes the already-fetched `club` rather than re-reading it, since every
// caller (the club detail page) already has it in hand from getClub().
export async function getClubDiscussions(clubId: string, club: Club): Promise<Discussion[]> {
  const snapshot = await getDocs(
    query(collection(db, 'clubs', clubId, 'discussions'), orderBy('createdAt', 'desc'))
  );
  return Promise.all(snapshot.docs.map((docSnap) => discussionFromDoc(clubId, club, docSnap)));
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
