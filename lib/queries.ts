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

import { normalizeClubScope } from '@/lib/clubScopes';
import { isCountryList } from '@/lib/countries';
import { db } from '@/lib/firebase';
import { isGrade } from '@/lib/gradeRange';
import { isCloudinaryImageUrl } from '@/lib/imageUpload';
import { getNextEventOccurrence } from '@/lib/time';
import type {
  Club,
  ClubAccess,
  ClubIconName,
  CoverPosition,
  Discussion,
  DiscussionKind,
  JoinRequest,
  JournalEntry,
  LookingForRole,
  Opportunity,
  OpportunityModerationStatus,
  Project,
  ProjectWithStats,
} from '@/lib/types';

export function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis();
  }
  return typeof value === 'number' ? value : Date.now();
}

// Accepts both the current array shape and the single-object shape older
// projects were saved with. Empty/invalid input reads as "not looking".
function normalizeLookingFor(value: unknown): LookingForRole[] | undefined {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const roles = items
    .filter((item): item is { role: string; description?: string } => typeof item?.role === 'string' && item.role.trim() !== '')
    .map((item) => ({ role: item.role, description: typeof item.description === 'string' ? item.description : '' }));
  return roles.length > 0 ? roles : undefined;
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
    liveUrl: data.liveUrl,
    visibility: data.visibility ?? 'public',
    lookingFor: normalizeLookingFor(data.lookingFor),
    links: Array.isArray(data.links) ? data.links : undefined,
    coverImageUrl: isCloudinaryImageUrl(data.coverImageUrl) ? data.coverImageUrl : undefined,
    coverPosition: toCoverPosition(data.coverPosition),
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    memberRoles: data.memberRoles,
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
  /** Free-text "about me," editable via EditProfileDialog. null until set. */
  bio: string | null;
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
      bio: null,
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
    bio: (data?.bio as string | undefined) ?? null,
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

// Same idea for opportunities — plus a moderationStatus filter, since this
// feeds Home's "For you" tab (a public surface). Same array-contains-any +
// equality shape as getProjectsByTags above, so it's covered the same way
// without a manual composite index.
export async function getOpportunitiesByTags(tags: string[], count: number): Promise<Opportunity[]> {
  if (tags.length === 0) return [];
  const snapshot = await getDocs(
    query(
      collection(db, 'opportunities'),
      where('tags', 'array-contains-any', tags.slice(0, 10)),
      where('moderationStatus', '==', 'approved'),
      limit(count)
    )
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
//
// Discover is for finding *other* people's work, so the viewer's own
// projects and anything they collaborate on are left out. Firestore has no
// "array does not contain" operator, so that part is filtered in memory —
// before the per-project counts, so excluded projects cost no extra reads.
// The in-memory visibility check repeats the query's filter on purpose:
// projectFromDoc defaults a missing visibility to 'public', and this list
// must never show a private or unlisted project regardless.
export async function getDiscoverProjects(viewerUid: string): Promise<ProjectWithStats[]> {
  const snapshot = await getDocs(
    query(collection(db, 'projects'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'))
  );
  const projects = snapshot.docs
    .map(projectFromDoc)
    .filter(
      (project) =>
        project.visibility === 'public' &&
        project.ownerUid !== viewerUid &&
        !project.memberUids.includes(viewerUid)
    );

  // One lookup per person, however many projects they're on.
  const names = new Map<string, Promise<string>>();
  const nameOf = (uid: string): Promise<string> => {
    if (!names.has(uid)) names.set(uid, getUserInfo(uid).then((info) => info.name).catch(() => 'Someone'));
    return names.get(uid) as Promise<string>;
  };

  return Promise.all(
    projects.map(async (project) => {
      const [countSnapshot, ownerName, collaboratorNames] = await Promise.all([
        getCountFromServer(collection(db, 'projects', project.id, 'journalEntries')).catch(() => null),
        nameOf(project.ownerUid),
        Promise.all(project.memberUids.filter((uid) => uid !== project.ownerUid).map(nameOf)),
      ]);
      return { ...project, journalEntryCount: countSnapshot?.data().count ?? 0, ownerName, collaboratorNames };
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
    customType: typeof data.customType === 'string' && data.customType ? data.customType : undefined,
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
    ageRange: typeof data.ageRange === 'string' ? data.ageRange : undefined,
    gradeMin: isGrade(data.gradeMin) ? data.gradeMin : undefined,
    gradeMax: isGrade(data.gradeMax) ? data.gradeMax : undefined,
    countries: isCountryList(data.countries) ? data.countries : undefined,
    // Any doc written before this field existed reads as already-approved —
    // see the doc comment on Opportunity.moderationStatus in lib/types.ts.
    // This only helps direct-by-id reads (getOpportunitiesByIds,
    // getSavedOpportunities); the where('moderationStatus', '==', 'approved')
    // list queries below still need those docs backfilled to surface them.
    moderationStatus: (data.moderationStatus as OpportunityModerationStatus | undefined) ?? 'approved',
    createdAt: toMillis(data.createdAt),
  } satisfies Opportunity;
}

function isOpportunity(value: Opportunity | null): value is Opportunity {
  return value !== null;
}

// Public surface (Home) — approved only. Same single-equality +
// orderBy('createdAt') shape as getPublicProjects above (a different field
// for the equality, same pattern), so no manual composite index needed here
// either.
export async function getOpenOpportunities(count: number): Promise<Opportunity[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'opportunities'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(count)
    )
  );
  const opportunities = await Promise.all(snapshot.docs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
}

// Opportunities directory (app/opportunities): every APPROVED opportunity,
// no cap — pending/rejected posts never reach this public page (see
// firestore.rules and getOwnOpportunities for where a poster sees those
// instead). Deliberately not ordered by deadline here — Firestore's orderBy
// silently drops documents missing the ordered field, which would hide any
// no-deadline opportunity instead of just sorting it last. The
// deadline-ascending-nulls-last sort happens in memory in OpportunitiesBoard.
export async function getAllOpportunities(): Promise<Opportunity[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'opportunities'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    )
  );
  const opportunities = await Promise.all(snapshot.docs.map(opportunityFromDoc));
  return opportunities.filter(isOpportunity);
}

// Every opportunity THIS user has ever submitted, any moderation status —
// "My submissions" on their own profile (ProfileView), so they can see
// what's still pending/was rejected, not just what went live. Provable
// against firestore.rules' read rule via the
// `request.auth.uid == resource.data.posterUid` branch, since the query
// itself is filtered to posterUid == uid.
export async function getOwnOpportunities(uid: string): Promise<Opportunity[]> {
  const snapshot = await getDocs(
    query(collection(db, 'opportunities'), where('posterUid', '==', uid), orderBy('createdAt', 'desc'))
  );
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

// Pinned opportunities (profile page) — same "fetch each id individually"
// shape as getSavedOpportunities, since pins are just a list of ids too.
export async function getOpportunitiesByIds(opportunityIds: string[]): Promise<Opportunity[]> {
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
    scope: normalizeClubScope(data.scope),
    customScope: typeof data.customScope === 'string' && data.customScope ? data.customScope : undefined,
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
    websiteUrl: typeof data.websiteUrl === 'string' && data.websiteUrl ? data.websiteUrl : undefined,
    whatYoullGet: Array.isArray(data.whatYoullGet) ? data.whatYoullGet : undefined,
    createdAt: toMillis(data.createdAt),
  } satisfies Club;
}

function clampPercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
}

function toCoverPosition(raw: unknown): CoverPosition | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { x, y } = raw as { x?: unknown; y?: unknown };
  return { x: clampPercent(x), y: clampPercent(y) };
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

// Every school name already in use — on people's profiles and on clubs —
// for the school field's suggestions, so the same school doesn't end up
// spelled three ways ("NNHS", "Newton North", "Newton North HS"), which
// would quietly break school-only clubs (they match names exactly).
// Spellings that differ only in case/spacing are merged under the most
// common one; most-used schools come first.
//
// Reads the whole users collection: fine at CoSync's size, but the first
// thing to replace with a maintained schools/{id} list as it grows.
export async function getKnownSchools(): Promise<string[]> {
  const [userSnaps, clubSnaps] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'clubs'))]);
  const names = [
    ...userSnaps.docs.map((docSnap) => docSnap.data().school),
    ...clubSnaps.docs.map((docSnap) => docSnap.data().schoolName),
  ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  const groups = new Map<string, Map<string, number>>();
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, ' ');
    const key = name.toLowerCase();
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(name, (spellings.get(name) ?? 0) + 1);
    groups.set(key, spellings);
  }

  return [...groups.values()]
    .map((spellings) => {
      const [best] = [...spellings.entries()].sort((a, b) => b[1] - a[1]);
      const total = [...spellings.values()].reduce((sum, count) => sum + count, 0);
      return { name: best[0], total };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((entry) => entry.name);
}

// Whether someone who isn't a member can find and freely join this club.
// Invite-only: never (the code is the only way in). School-only: only
// students whose profile school matches the club's — and a school-only club
// with no school recorded is code-only too. firestore.rules mirrors this
// for the join itself.
export function isClubOpenTo(club: Club, viewerSchool: string | null): boolean {
  if (club.access === 'invite') return false;
  if (club.access === 'schoolOnly') return Boolean(club.schoolName) && club.schoolName === viewerSchool;
  return true;
}

// Clubs this user is NOT in yet. Firestore has no "array does not contain"
// operator, so there's no way to push the exclusion server-side — this
// fetches every club (the clubs read rule already allows any signed-in user
// to read the whole collection) and filters out memberships in memory.
//
// Invite-only clubs, and school-only clubs at other schools, never appear
// here — the way in is an admin's join code (lib/clubInvites.ts).
export async function getDiscoverableClubs(uid: string): Promise<Club[]> {
  const [clubs, viewer] = await Promise.all([getAllClubs(), getUserInfo(uid)]);
  return clubs.filter((club) => isClubOpenTo(club, viewer.school) && !club.memberUids.includes(uid));
}

// Two other clubs sharing at least one tag with `club`, falling back to any
// other clubs if there's no tag overlap — used by the detail page's
// "Related clubs" sidebar list.
export async function getRelatedClubs(club: Club, count: number, viewerSchool: string | null): Promise<Club[]> {
  const clubs = (await getAllClubs()).filter(
    (candidate) => candidate.id !== club.id && isClubOpenTo(candidate, viewerSchool)
  );
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
      // Over-fetch a little so dropped orphans (below) don't leave the feed short.
      limit(count * 2 + 5)
    )
  );
  const entries = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const projectRef = docSnap.ref.parent.parent;
      const projectSnap = projectRef ? await getDoc(projectRef).catch(() => null) : null;
      // Deleting a project doc (e.g. by hand in the Firebase console) leaves
      // its journalEntries subcollection behind, and this collectionGroup
      // query still finds those orphans. Drop any entry whose project is
      // gone or no longer public instead of showing a card that leads to a
      // "doesn't exist" page.
      const projectData = projectSnap?.exists() ? projectSnap.data() : null;
      if (!projectRef || !projectData || projectData.visibility !== 'public') return null;
      return journalEntryFromDoc(projectRef.id, (projectData.title as string | undefined) ?? 'a project', docSnap);
    })
  );
  return entries.filter((entry): entry is JournalEntry => entry !== null).slice(0, count);
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

export type FollowSuggestion = UserInfo & {
  topInterest: string | null;
  /** Names of people the viewer follows who also follow this person, most
   * relevant first — drives "Followed by X and N others you follow". */
  mutualNames: string[];
  /** Total count behind mutualNames (which is capped for display). */
  mutualCount: number;
  /** This person already follows the viewer. */
  followsYou: boolean;
};

const MUTUAL_NAME_PREVIEW = 2;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function suggestionFromUserDoc(
  docSnap: DocumentSnapshot<DocumentData>
): Omit<FollowSuggestion, 'mutualNames' | 'mutualCount' | 'followsYou'> | null {
  const data = docSnap.data();
  if (!data) return null;
  // Students only. CLAUDE.md is explicit that adults use this app to post
  // opportunities and mentor through public threads, not to accumulate
  // followers — and an account with no role yet hasn't finished onboarding,
  // so there's no way to know it isn't an adult.
  if (data.role !== 'student') return null;
  const name = (data.displayName as string | undefined) ?? (data.handle as string | undefined);
  if (!name) return null; // hasn't actually signed up/synced a profile yet
  const interests: string[] = Array.isArray(data.interests) ? data.interests : [];
  return {
    uid: docSnap.id,
    name,
    photoURL: (data.photoURL as string | undefined) ?? null,
    verified: Boolean(data.verified),
    role: 'student',
    school: (data.school as string | undefined) ?? null,
    location: (data.location as string | undefined) ?? null,
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : null,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : null,
    bio: (data.bio as string | undefined) ?? null,
    topInterest: interests[0] ?? null,
  };
}

// Home sidebar's "You might follow" — real signed-up students the viewer
// doesn't follow yet, ranked by social signal first:
//   1. mutuals — how many of the people the viewer follows also follow them
//   2. whether they already follow the viewer (a follow-back)
// then everyone else, so a newer account with no connections yet still
// shows up instead of the list being capped at whoever happens to have
// mutuals.
//
// Firestore can't express "not this uid / not already followed" or count
// across documents in one query, so this reads the viewer's follow graph
// one hop out (follows where followerUid in [people I follow], 30 per `in`
// query) and tallies in memory. Fine at this app's scale; a big graph would
// want a precomputed suggestions doc instead.
export async function getFollowSuggestions(viewerUid: string, count: number): Promise<FollowSuggestion[]> {
  const followsRef = collection(db, 'follows');
  const [followingSnapshot, followersSnapshot, studentsSnapshot] = await Promise.all([
    getDocs(query(followsRef, where('followerUid', '==', viewerUid))),
    getDocs(query(followsRef, where('followedUid', '==', viewerUid))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'student'), limit(200))),
  ]);

  const followingUids = followingSnapshot.docs.map((docSnap) => docSnap.data().followedUid as string);
  const alreadyFollowing = new Set(followingUids);
  const followsViewer = new Set(followersSnapshot.docs.map((docSnap) => docSnap.data().followerUid as string));
  const isCandidate = (uid: string): boolean => uid !== viewerUid && !alreadyFollowing.has(uid);

  // candidate uid -> uids of people the viewer follows who follow them
  const mutualsByCandidate = new Map<string, string[]>();
  const secondHopSnapshots = await Promise.all(
    chunk(followingUids, 30).map((uids) => getDocs(query(followsRef, where('followerUid', 'in', uids))))
  );
  for (const snapshot of secondHopSnapshots) {
    for (const docSnap of snapshot.docs) {
      const { followerUid, followedUid } = docSnap.data() as { followerUid: string; followedUid: string };
      if (!isCandidate(followedUid)) continue;
      mutualsByCandidate.set(followedUid, [...(mutualsByCandidate.get(followedUid) ?? []), followerUid]);
    }
  }

  // Everyone with a social signal might fall outside the 200-student batch
  // above, so read any of those profiles that batch didn't already include.
  const profiles = new Map<string, NonNullable<ReturnType<typeof suggestionFromUserDoc>>>();
  for (const docSnap of studentsSnapshot.docs) {
    const profile = suggestionFromUserDoc(docSnap);
    if (profile) profiles.set(profile.uid, profile);
  }
  const signalUids = [...mutualsByCandidate.keys(), ...followsViewer].filter(
    (uid) => isCandidate(uid) && !profiles.has(uid)
  );
  const extraDocs = await Promise.all(
    Array.from(new Set(signalUids)).map((uid) => getDoc(doc(db, 'users', uid)).catch(() => null))
  );
  for (const docSnap of extraDocs) {
    const profile = docSnap ? suggestionFromUserDoc(docSnap) : null;
    if (profile) profiles.set(profile.uid, profile);
  }

  const ranked = Array.from(profiles.values())
    .filter((profile) => isCandidate(profile.uid))
    .map((profile) => ({
      profile,
      mutualUids: mutualsByCandidate.get(profile.uid) ?? [],
      followsYou: followsViewer.has(profile.uid),
    }))
    .sort(
      (a, b) =>
        b.mutualUids.length - a.mutualUids.length || Number(b.followsYou) - Number(a.followsYou)
    )
    .slice(0, count);

  // Only the handful of names actually displayed get resolved.
  return Promise.all(
    ranked.map(async ({ profile, mutualUids, followsYou }) => ({
      ...profile,
      mutualNames: (await Promise.all(mutualUids.slice(0, MUTUAL_NAME_PREVIEW).map(getUserInfo))).map(
        (info) => info.name
      ),
      mutualCount: mutualUids.length,
      followsYou,
    }))
  );
}

export type UpcomingClubEvent = {
  event: Discussion;
  clubId: string;
  clubName: string;
  /** When this event next happens — for a recurring event, the next
   * occurrence (lib/time.ts's getNextEventOccurrence), not its stored
   * eventDate, which is only the series' anchor. */
  nextOccurrence: number;
};

// Every upcoming event across the clubs this user belongs to, soonest
// first — Home sidebar's "This week". One discussions read per club; a
// user is only ever in a handful of clubs, so that's cheap.
export async function getUpcomingClubEvents(uid: string): Promise<UpcomingClubEvent[]> {
  const clubs = await getUserClubs(uid);
  const perClub = await Promise.all(
    clubs.map(async (club) => {
      const discussions = await getClubDiscussions(club.id, club).catch(() => []);
      return discussions
        .filter((discussion) => discussion.kind === 'event')
        .map((event) => ({ event, clubId: club.id, clubName: club.name, nextOccurrence: getNextEventOccurrence(event) }))
        .filter((item): item is UpcomingClubEvent => item.nextOccurrence !== undefined);
    })
  );
  return perClub.flat().sort((a, b) => a.nextOccurrence - b.nextOccurrence);
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

// Invite-by-email (InviteDialog): an exact-match lookup only — no partial/
// live search, deliberately, so this can only ever answer "does this one
// specific address have an account," never let someone browse/enumerate
// other users' emails the way a prefix search would. See useAuth.ts's
// syncProfile for where emailLower gets written.
export async function findUserByEmail(email: string): Promise<UserInfo | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const snapshot = await getDocs(query(collection(db, 'users'), where('emailLower', '==', normalized), limit(1)));
  const docSnap = snapshot.docs[0];
  if (!docSnap) return null;
  return getUserInfo(docSnap.id);
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
      bio: (data.bio as string | undefined) ?? null,
    } satisfies UserInfo;
  });
}
