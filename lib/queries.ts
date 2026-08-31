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
  JoinRequest,
  JournalEntry,
  Opportunity,
  Project,
  ProjectWithStats,
} from '@/lib/types';

export function toMillis(value: unknown): number {
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
    links: Array.isArray(data.links) ? data.links : undefined,
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    followerCount: data.followerCount ?? 0,
    followerUids: Array.isArray(data.followerUids) ? data.followerUids : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export type UserInfo = {
  uid: string;
  name: string;
  /** The synced Google account photo (see useAuth's profile sync) — null
   * until that's run at least once, or if the account has no photo. */
  photoURL: string | null;
  verified: boolean;
  role: string | null;
  school: string | null;
  /** Coarse, self-reported city/area. Powers Home's Nearby filter tab. null
   * until the person sets one via LocationField. */
  location: string | null;
  /** The city-level centroid behind `location` (LocationField restricts
   * its Places Autocomplete to whole cities, never a street address) — see
   * lib/location.ts's getDistanceMiles for why that distinction matters.
   * null whenever location is null, or was set before this field existed. */
  locationLat: number | null;
  locationLng: number | null;
};

export async function getUserInfo(uid: string): Promise<UserInfo> {
  if (!uid) {
    return {
      uid: '',
      name: 'Someone',
      photoURL: null,
      verified: false,
      role: null,
      school: null,
      location: null,
      locationLat: null,
      locationLng: null,
    };
  }
  const snapshot = await getDoc(doc(db, 'users', uid));
  const data = snapshot.data();
  return {
    uid,
    name: (data?.displayName as string | undefined) ?? (data?.handle as string | undefined) ?? 'Someone',
    photoURL: (data?.photoURL as string | undefined) ?? null,
    verified: Boolean(data?.verified),
    role: (data?.role as string | undefined) ?? null,
    school: (data?.school as string | undefined) ?? null,
    location: (data?.location as string | undefined) ?? null,
    locationLat: typeof data?.locationLat === 'number' ? data.locationLat : null,
    locationLng: typeof data?.locationLng === 'number' ? data.locationLng : null,
  };
}

// Interests now live on the main users/{uid} doc (matching CLAUDE.md's
// documented schema) so a profile page can show them to any signed-in
// visitor, not just the owner — a deliberate product decision, since they
// used to live at users/{uid}/private/profile specifically to keep them
// owner-only. The fallback read below is only for uids that onboarded
// before that change and never re-saved; it's skipped entirely once the
// main doc has a real answer, so it doesn't add a second read per call in
// the common case.
export async function getUserInterests(uid: string): Promise<string[]> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  const interests = snapshot.data()?.interests;
  if (Array.isArray(interests) && interests.length > 0) return interests;

  const legacySnapshot = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
  const legacyInterests = legacySnapshot.data()?.interests;
  return Array.isArray(legacyInterests) ? legacyInterests : [];
}

// Public projects whose tags overlap with the given interests — Home's "For
// you" tab uses this instead of getPublicProjects when the viewer actually
// has interests set, so the "recommended" label means something real.
// array-contains-any caps at 10 values, hence the slice.
//
// The extra visibility filter isn't just belt-and-suspenders: Firestore
// rejects a list query outright unless it can statically prove every
// possible result satisfies the security rule's OR'd conditions, and a bare
// `tags array-contains-any` filter doesn't line up with any branch of
// `visibility == 'public' || ownerUid == uid || uid in memberUids` on its
// own (see getFollowedProjects for the same fix, hit the same way).
export async function getProjectsByTags(tags: string[], count: number): Promise<Project[]> {
  if (tags.length === 0) return [];
  const snapshot = await getDocs(
    query(
      collection(db, 'projects'),
      where('tags', 'array-contains-any', tags.slice(0, 10)),
      where('visibility', '==', 'public'),
      limit(count)
    )
  );
  return snapshot.docs.map(projectFromDoc);
}

// Same idea for opportunities. No extra filter needed here — opportunities'
// read rule is just `auth != null`, true for any signed-in request
// regardless of resource.data, so it's already provable for any query shape.
export async function getOpportunitiesByTags(tags: string[], count: number): Promise<Opportunity[]> {
  if (tags.length === 0) return [];
  const snapshot = await getDocs(
    query(collection(db, 'opportunities'), where('tags', 'array-contains-any', tags.slice(0, 10)), limit(count))
  );
  const opportunities = await Promise.all(snapshot.docs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
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
    status: data.status,
    openDate: data.openDate ? toMillis(data.openDate) : undefined,
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

async function journalEntryFromDoc(
  projectId: string,
  projectTitle: string,
  docSnap: QueryDocumentSnapshot<DocumentData>
): Promise<JournalEntry> {
  const data = docSnap.data();
  const authorUid: string = data.authorUid ?? '';
  const author = await getUserInfo(authorUid);
  return {
    id: docSnap.id,
    projectId,
    projectTitle,
    authorUid,
    authorName: author.name,
    content: data.content ?? '',
    mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : undefined,
    cheerCount: data.cheerCount ?? 0,
    cheeredByUids: Array.isArray(data.cheeredByUids) ? data.cheeredByUids : [],
    commentCount: data.commentCount ?? 0,
    createdAt: toMillis(data.createdAt),
  } satisfies JournalEntry;
}

// collectionGroup reaches every project's journalEntries subcollection in one
// query. Firestore will throw a "requires an index" error with a console
// link the first time this runs against a real project — that's expected,
// not a bug; follow the link once and it won't happen again.
//
// The `where('projectVisibility', '==', 'public')` filter isn't optional
// styling, the way it might look next to getPublicProjects' identical-
// looking one — it's load-bearing for two different reasons at once:
//   1. Correctness: this is a *global* feed shown to any signed-in viewer,
//      so it must never surface an update from an unlisted/private
//      project, the same as every other public feed query in this file.
//   2. It's the only thing that makes this query even *legal*. A journal
//      entry has no visibility of its own — the real rule for it depends on
//      a get() lookup on its *parent* project, which Firestore's query
//      planner can't statically prove holds for "the 3 most recent entries
//      across every project in the database." Without a where() clause
//      that lines up with a directly-provable branch of the read rule
//      (see firestore.rules' journalEntries read rule), Firestore rejects
//      the entire query with "Missing or insufficient permissions" rather
//      than filtering results per-document — same class of issue
//      getProjectsByTags/getFollowedProjects/getRelatedProjects already
//      work around, just for a collectionGroup query instead of a
//      collection one. `projectVisibility` is denormalized onto each entry
//      at write time (see ProjectJournalComposer) specifically so this
//      filter has a real field to match against.
export async function getRecentJournalEntries(count: number): Promise<JournalEntry[]> {
  const snapshot = await getDocs(
    query(
      collectionGroup(db, 'journalEntries'),
      where('projectVisibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(count)
    )
  );
  return Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const projectRef = docSnap.ref.parent.parent;
      const projectSnap = projectRef ? await getDoc(projectRef) : null;
      const projectTitle = (projectSnap?.data()?.title as string | undefined) ?? 'a project';
      return journalEntryFromDoc(projectRef?.id ?? '', projectTitle, docSnap);
    })
  );
}

// Owned vs contributing are two separate queries rather than one "any project
// I'm involved with" query + client-side split — Firestore can filter
// ownerUid == uid server-side, and array-contains for memberUids server-side,
// but not "memberUids contains uid AND ownerUid != uid" in a single query.
// Piece 1's board fetches both and keeps them as separate arrays throughout
// (never merges them back into one list) since they render in two distinct
// sections with different card content.
export async function getOwnedProjects(uid: string): Promise<Project[]> {
  const snapshot = await getDocs(query(collection(db, 'projects'), where('ownerUid', '==', uid)));
  return snapshot.docs.map(projectFromDoc);
}

// Unlike getOwnedProjects (every project this uid owns, any visibility —
// correct for viewing your OWN profile), this is what someone else's
// profile page uses: the visibility check happens in the query itself via
// the second where(), not just by hiding non-public ones in the UI, so a
// private/unlisted project is never actually returned to another viewer in
// the first place.
export async function getPublicProjectsByOwner(uid: string): Promise<Project[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects'), where('ownerUid', '==', uid), where('visibility', '==', 'public'))
  );
  return snapshot.docs.map(projectFromDoc);
}

export async function getContributingProjects(uid: string): Promise<Project[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects'), where('memberUids', 'array-contains', uid))
  );
  return snapshot.docs.map(projectFromDoc).filter((project) => project.ownerUid !== uid);
}

// Projects this user follows (the "+ Follow project" button on a project's
// viewer page) — powers Home's "Following" filter tab. Follow is only ever
// offered on public projects (a non-member can't even load a private/draft
// one to follow it), so the visibility filter below is redundant with the
// data's actual invariants — but it's required anyway: Firestore rejects a
// list query outright if it can't statically prove every possible result
// satisfies the security rule's OR'd conditions, and `followerUids
// array-contains uid` alone doesn't line up with any of
// `visibility == 'public' || ownerUid == uid || uid in memberUids`. Filtering
// on visibility here makes the query provably match that first branch.
export async function getFollowedProjects(uid: string): Promise<Project[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'projects'),
      where('followerUids', 'array-contains', uid),
      where('visibility', '==', 'public')
    )
  );
  return snapshot.docs.map(projectFromDoc);
}

// Following a PERSON (profile page) is a different mechanism than following
// a PROJECT (getFollowedProjects above) — a project's followers live in a
// followerUids[] array directly on that one project doc, which works
// because only that doc's owner needs to ever write it. A person can't be
// followed the same way: the target user's own users/{uid} doc can only be
// written by that user (see CLAUDE.md's security rules), so whoever follows
// them can't be the one to update it. This is exactly why CLAUDE.md's data
// model calls out a standalone follows/{followerUid}_{followedUid}
// collection — the follower creates their own doc in a shared collection
// instead of writing onto the target's doc at all. See useFollowUser.ts for
// the write side of this.
export async function getFollowerCount(uid: string): Promise<number> {
  const snapshot = await getCountFromServer(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  return snapshot.data().count;
}

export async function getFollowingCount(uid: string): Promise<number> {
  const snapshot = await getCountFromServer(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  return snapshot.data().count;
}

export async function getFollowers(uid: string): Promise<UserInfo[]> {
  const snapshot = await getDocs(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  const followerUids = snapshot.docs.map((docSnap) => docSnap.data().followerUid as string);
  return Promise.all(followerUids.map((followerUid) => getUserInfo(followerUid)));
}

export async function getFollowing(uid: string): Promise<UserInfo[]> {
  const snapshot = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  const followedUids = snapshot.docs.map((docSnap) => docSnap.data().followedUid as string);
  return Promise.all(followedUids.map((followedUid) => getUserInfo(followedUid)));
}

export type FollowSuggestion = UserInfo & { topInterest: string | null };

// Home sidebar's "You might follow" — real signed-up students, not a
// hardcoded placeholder list. Adults (educators/guardians/admins) are
// excluded: CLAUDE.md is explicit that adults use this app to post
// opportunities and mentor through public threads, not to accumulate
// followers, so they shouldn't show up as someone to follow either.
//
// Same "fetch a batch, filter in memory" pattern as getDiscoverableClubs —
// Firestore can't combine a role-equality filter with "not this uid" and
// "not already followed" in one query, so this over-fetches a bit and
// trims client-side rather than round-tripping per candidate.
export async function getFollowSuggestions(viewerUid: string, count: number): Promise<FollowSuggestion[]> {
  const [usersSnapshot, followsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('role', '==', 'student'), limit(count * 10 + 20))),
    getDocs(query(collection(db, 'follows'), where('followerUid', '==', viewerUid))).catch(() => null),
  ]);
  const alreadyFollowing = new Set(
    (followsSnapshot?.docs ?? []).map((docSnap) => docSnap.data().followedUid as string)
  );

  const suggestions: FollowSuggestion[] = [];
  for (const docSnap of usersSnapshot.docs) {
    if (suggestions.length >= count) break;
    if (docSnap.id === viewerUid || alreadyFollowing.has(docSnap.id)) continue;

    const data = docSnap.data();
    const name = (data.displayName as string | undefined) ?? (data.handle as string | undefined);
    if (!name) continue; // hasn't actually signed up/synced a profile yet

    const interests: string[] = Array.isArray(data.interests) ? data.interests : [];
    suggestions.push({
      uid: docSnap.id,
      name,
      photoURL: (data.photoURL as string | undefined) ?? null,
      verified: Boolean(data.verified),
      role: (data.role as string | undefined) ?? null,
      school: (data.school as string | undefined) ?? null,
      location: (data.location as string | undefined) ?? null,
      locationLat: typeof data.locationLat === 'number' ? data.locationLat : null,
      locationLng: typeof data.locationLng === 'number' ? data.locationLng : null,
      topInterest: interests[0] ?? null,
    });
  }
  return suggestions;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snapshot = await getDoc(doc(db, 'projects', projectId));
  return snapshot.exists() ? projectFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>) : null;
}

export async function getProjectJournalEntries(project: Project): Promise<JournalEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects', project.id, 'journalEntries'), orderBy('createdAt', 'desc'))
  );
  return Promise.all(snapshot.docs.map((docSnap) => journalEntryFromDoc(project.id, project.title, docSnap)));
}

// The dashboard card's "N entries · updated X" + "Latest: ..." strip needs
// only the count and the single newest entry, not the full list — a count
// aggregation plus a limit(1) query is much cheaper than fetching every
// entry (getProjectJournalEntries) just to read entries.length and [0].
export async function getProjectJournalEntryCount(projectId: string): Promise<number> {
  const snapshot = await getCountFromServer(collection(db, 'projects', projectId, 'journalEntries'));
  return snapshot.data().count;
}

export async function getLatestJournalEntry(project: Project): Promise<JournalEntry | null> {
  const snapshot = await getDocs(
    query(collection(db, 'projects', project.id, 'journalEntries'), orderBy('createdAt', 'desc'), limit(1))
  );
  const docSnap = snapshot.docs[0];
  return docSnap ? journalEntryFromDoc(project.id, project.title, docSnap) : null;
}

// Resolves display names for just the first `count` collaborator uids —
// same "avatar stack only shows a handful of faces" trade-off as
// getClubMemberPreviews.
export async function getProjectMemberPreviews(memberUids: string[], count: number): Promise<UserInfo[]> {
  return Promise.all(memberUids.slice(0, count).map((uid) => getUserInfo(uid)));
}

// Two other public projects sharing at least one tag, falling back to any
// other public projects if there's no tag overlap — same pattern as
// getRelatedClubs, used by the viewer-side sidebar's "Related" section.
export async function getRelatedProjects(project: Project, count: number): Promise<Project[]> {
  const snapshot = await getDocs(query(collection(db, 'projects'), where('visibility', '==', 'public')));
  const candidates = snapshot.docs.map(projectFromDoc).filter((candidate) => candidate.id !== project.id);
  const scored = candidates
    .map((candidate) => ({
      candidate,
      sharedTags: candidate.tags.filter((tag) => project.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.sharedTags - a.sharedTags);
  return scored.slice(0, count).map(({ candidate }) => candidate);
}

async function joinRequestFromDoc(docSnap: QueryDocumentSnapshot<DocumentData>): Promise<JoinRequest> {
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    name: data.name ?? 'Someone',
    status: 'pending',
    createdAt: toMillis(data.createdAt),
  } satisfies JoinRequest;
}

// Every doc remaining in joinRequests IS pending — Accept/Decline delete the
// doc rather than marking it resolved (see firestore.rules for why), so
// there's nothing else a doc here could be. The where() clause is kept
// anyway so the query still reads correctly if that invariant ever changes.
export async function getJoinRequests(projectId: string): Promise<JoinRequest[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects', projectId, 'joinRequests'), where('status', '==', 'pending'))
  );
  return Promise.all(snapshot.docs.map(joinRequestFromDoc));
}

export async function getOwnJoinRequest(projectId: string, uid: string): Promise<JoinRequest | null> {
  const snapshot = await getDoc(doc(db, 'projects', projectId, 'joinRequests', uid));
  return snapshot.exists() ? joinRequestFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>) : null;
}

// @mention autocomplete (CommentComposer): a prefix range query on
// displayNameLower ("jai" matches ["jai", "jai)") — the same trick as
// any Firestore "starts with" search, since Firestore has no native
// full-text search. Case-insensitive only because useAuth's syncProfile
// also writes a lowercased copy of displayName; a user who signed in
// before that field existed won't be findable until they sign in again.
// Runs once per keystroke from the composer (debounced there) — see this
// project's write-up of why that's fine at this app's scale, not something
// to build caching/server-side search for yet.
export async function searchUsersByPrefix(prefix: string, count: number): Promise<UserInfo[]> {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) return [];
  const snapshot = await getDocs(
    query(
      collection(db, 'users'),
      orderBy('displayNameLower'),
      where('displayNameLower', '>=', normalized),
      where('displayNameLower', '<', `${normalized}`),
      limit(count)
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      name: (data.displayName as string | undefined) ?? (data.handle as string | undefined) ?? 'Someone',
      photoURL: (data.photoURL as string | undefined) ?? null,
      verified: Boolean(data.verified),
      role: (data.role as string | undefined) ?? null,
      school: (data.school as string | undefined) ?? null,
      location: (data.location as string | undefined) ?? null,
      locationLat: typeof data.locationLat === 'number' ? data.locationLat : null,
      locationLng: typeof data.locationLng === 'number' ? data.locationLng : null,
    } satisfies UserInfo;
  });
}
