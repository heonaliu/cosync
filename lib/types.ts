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
  memberUids: string[];
  followerCount: number;
  createdAt: number;
  updatedAt: number;
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
  /** Weekly-recurring vs one-off — changes how ClubEventCard formats the
   * date line ("Every Thursday at 3pm" vs a specific date). */
  recurring?: boolean;
  /** RSVP counts for kind: 'event' discussions. Not in CLAUDE.md's base
   * discussions schema — added because the Going/Interested buttons on the
   * event card need real numbers to show. Display-only for now; the
   * buttons don't write a real RSVP yet. */
  goingCount?: number;
  interestedCount?: number;
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
  cheerCount: number;
  commentCount: number;
  createdAt: number;
};
