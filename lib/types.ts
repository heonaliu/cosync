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
  tags: string[];
  applicationUrl?: string;
  verified: boolean;
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
