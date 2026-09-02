import { arrayRemove, deleteField, doc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Project, ProjectMemberRole } from '@/lib/types';

export type ProjectRole = 'owner' | ProjectMemberRole;

// Single source of truth for "what role is this uid" — a memberUid with no
// entry in memberRoles is implicitly 'collaborator' (see lib/types.ts's
// Project.memberRoles doc comment). firestore.rules' isManager() function
// encodes this same default independently, since rules can't import this.
export function getMemberRole(project: Project, uid: string): ProjectRole {
  if (uid === project.ownerUid) return 'owner';
  return project.memberRoles?.[uid] ?? 'collaborator';
}

// Owner or co-owner — the tier that can manage membership and delete any
// post, not just their own.
export function isProjectManager(project: Project, uid: string): boolean {
  const role = getMemberRole(project, uid);
  return role === 'owner' || role === 'coOwner';
}

// Owner-or-co-owner action: change another member's role. Not offered for
// the project owner themselves (they're not in memberRoles at all — see
// getMemberRole).
export async function setProjectMemberRole(
  projectId: string,
  memberUid: string,
  role: ProjectMemberRole
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), { [`memberRoles.${memberUid}`]: role });
}

// Removes someone from the project entirely — both their membership and
// whatever role they had. Owner-or-co-owner action.
export async function removeProjectMember(projectId: string, memberUid: string): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    memberUids: arrayRemove(memberUid),
    [`memberRoles.${memberUid}`]: deleteField(),
  });
}
