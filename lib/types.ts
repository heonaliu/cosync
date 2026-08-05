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
