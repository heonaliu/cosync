export type UserRole = 'student' | 'educator' | 'guardian' | 'admin';

export type ProjectStage = 'idea' | 'prototyping' | 'shipping';
export type ProjectVisibility = 'public' | 'unlisted' | 'draft';

export type Project = {
  id: string;
  ownerUid: string;
  title: string;
  pitch: string;
  description: string;
  tags: string[];
  stage: ProjectStage;
  visibility: ProjectVisibility;
  lookingFor?: { role: string; description: string };
  /** Reference links (repo, demo video, BOM, ...) shown in the detail page's
   * sidebar. Owner-editable, same "empty section renders nothing" pattern as
   * Club.pinnedResources. */
  links?: { label: string; url: string }[];
  memberUids: string[];
  followerCount: number;
  /** Uids who've followed — same toggle-not-just-increment pattern as
   * Discussion.cheeredByUids, so "+ Follow project" can show each viewer
   * their own followed state instead of only ever incrementing. */
  followerUids?: string[];
  createdAt: number;
  updatedAt: number;
};

/** A pending ask-to-join request. Doc id under projects/{projectId}/joinRequests
 * IS the requester's uid — one request per person per project, so "have I
 * already asked?" is a getDoc by id rather than a query, and Accept/Decline
 * never have to disambiguate which of several requests from the same person
 * to resolve. Accepting or declining deletes the doc rather than updating
 * status in place — see firestore.rules for why. */
export type JoinRequest = {
  uid: string;
  name: string;
  status: 'pending';
  createdAt: number;
};

// Discover's cards show a journal-entry count alongside the project, which
// isn't a field on the project doc itself — it's a separate aggregation
// query per project, so it's modeled as a distinct type rather than baked
// into Project.
export type ProjectWithStats = Project & { journalEntryCount: number };

export type OpportunityType =
  | 'research'
  | 'hackathon'
  | 'competition'
  | 'mentorship'
  | 'program';

// The poster's own read on where things stand — distinct from `deadline`
// (a single application-close date, which can coexist with any status).
export type OpportunityStatus = 'rolling' | 'ongoing' | 'soon' | 'passed';

export type Opportunity = {
  id: string;
  posterUid: string;
  posterName: string;
  posterVerified: boolean;
  type: OpportunityType;
  title: string;
  description: string;
  deadline?: number;
  location?: string;
  /** Set only when `location` came from a selected Places suggestion rather
   * than free text (e.g. "Online") — see AddressAutocompleteInput. */
  lat?: number;
  lng?: number;
  tags: string[];
  applicationUrl?: string;
  verified: boolean;
  featured?: boolean;
  /** undefined on opportunities posted before this field existed — the UI
   * omits a status chip entirely for those rather than guessing one. The
   * Add/Edit forms always set one going forward (defaulting to 'rolling'). */
  status?: OpportunityStatus;
  /** Only meaningful when status === 'soon' — the date applications open.
   * The Add/Edit forms require this whenever 'soon' is selected, since
   * "opening soon" with no date isn't a real answer. */
  openDate?: number;
  createdAt: number;
};

export type SavedOpportunity = {
  opportunityId: string;
  createdAt: number;
  address?: string;
  lat?: number;
  lng?: number;
};

export type ClubIconName = 'cpu' | 'robot' | 'brain' | 'palette' | 'book' | 'music';
export type ClubColorName = 'sky' | 'amber' | 'sage' | 'lilac' | 'peach';
export type ClubScope = 'school' | 'online' | 'hybrid';
export type ClubAccess = 'anyone' | 'schoolOnly' | 'invite';

export type Club = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  iconName: ClubIconName;
  colorName: ClubColorName;
  scope: ClubScope;
  schoolName?: string;
  access: ClubAccess;
  memberUids: string[];
  adminUids: string[];
  advisorUid?: string;
  /** Resolved from users/{advisorUid} at read time, not stored on the club
   * doc — same denormalize-on-read pattern as Opportunity.posterName. */
  advisorName?: string;
  memberCount: number;
  // Detail-page-only fields — none of these are collected by the Start a
  // Club form (Piece 4 has no inputs for them), so they only exist on
  // clubs seeded/edited directly in Firestore. The detail page omits each
  // section gracefully when its field is absent, rather than showing
  // placeholder/fake content for clubs that never set them.
  meetsSchedule?: string;
  cohortSize?: string;
  cost?: string;
  pinnedResources?: { label: string; url?: string }[];
  whatYoullGet?: string[];
  createdAt: number;
};

export type DiscussionKind = 'discussion' | 'announcement' | 'event';

export type Discussion = {
  id: string;
  clubId: string;
  authorUid: string;
  authorName: string;
  /** True if the author's role is educator/admin, or they're this club's
   * advisor — drives the shield-check icon next to their name. */
  authorIsEducator: boolean;
  title: string;
  content: string;
  kind: DiscussionKind;
  eventDate?: number;
  eventLocation?: string;
  /** Free-text name of who's running the event — the composer's "Hosted by"
   * field defaults to the club's advisorName but is editable. */
  eventHost?: string;
  /** Which weekdays this event repeats on (0 = Sunday ... 6 = Saturday, JS
   * Date#getDay() convention). Empty/undefined = one-time event. Lets
   * someone pick "every Monday and Wednesday" instead of just a blanket
   * weekly-on-the-same-day toggle. There's still exactly one Discussion doc
   * per recurring series, not a doc per occurrence — getNextEventOccurrence
   * in lib/time.ts computes the next real date on the fly from this. */
  recurringDays?: number[];
  /** RSVP counts for kind: 'event' discussions. Not in CLAUDE.md's base
   * discussions schema — added because the Going/Interested buttons on the
   * event card need real numbers to show. */
  goingCount?: number;
  interestedCount?: number;
  /** Uids currently RSVP'd — mutually exclusive (being in one array means
   * not being in the other), lets the buttons toggle per-viewer instead of
   * just incrementing forever. */
  goingUids?: string[];
  interestedUids?: string[];
  replyCount: number;
  cheerCount: number;
  /** Uids who've cheered — lets the Cheer button toggle instead of just
   * incrementing forever, and shows each viewer their own cheered state. */
  cheeredByUids?: string[];
  createdAt: number;
};

export type JournalEntry = {
  id: string;
  projectId: string;
  projectTitle: string;
  authorUid: string;
  authorName: string;
  content: string;
  /** Attachment filenames/URLs shown as a small preview strip — the Photo/Code
   * buttons on the composer don't do real uploads yet, so this holds
   * whatever a caller (e.g. seed data) sets directly. */
  mediaUrls?: string[];
  cheerCount: number;
  /** Uids who've cheered — same toggle-not-just-increment pattern as
   * Discussion.cheeredByUids. */
  cheeredByUids?: string[];
  commentCount: number;
  createdAt: number;
};
