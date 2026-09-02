'use client';

import { useEffect, useState } from 'react';

import { JournalEntryCard } from '@/components/features/JournalEntryCard';
import { ProjectHeader } from '@/components/features/ProjectHeader';
import { ProjectJournalComposer } from '@/components/features/ProjectJournalComposer';
import { ProjectSidebar, type RelatedProjectEntry } from '@/components/features/ProjectSidebar';
import { isProjectManager } from '@/lib/projectRoles';
import {
  getJoinRequests,
  getProject,
  getProjectJournalEntries,
  getProjectMemberPreviews,
  getRelatedProjects,
  getUserInfo,
  type UserInfo,
} from '@/lib/queries';
import type { JoinRequest, JournalEntry, Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ProjectDetailProps = {
  projectId: string;
};

// A viewer's initial journal view is capped, with a "show all" link to
// reveal the rest — matches the mockup's "2 shown + N more entries" pattern.
// Members always see the full list, so this constant only ever applies when
// isMember is false.
const VIEWER_INITIAL_ENTRY_COUNT = 2;

// undefined = still loading, null = doesn't exist / not visible to this
// viewer (a private project's read rule denies anyone but the owner/
// members, so a non-member's getProject() call fails closed into this same
// state — from their side, a private project simply isn't there).
export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhotoURL, setOwnerPhotoURL] = useState<string | null>(null);
  // collaborators keeps the uid alongside each name (ProjectTeamList links
  // to profiles); collaboratorNames is derived from it for ProjectHeader,
  // which only ever joins names into a sentence and has no use for uids.
  const [collaborators, setCollaborators] = useState<UserInfo[]>([]);
  const collaboratorNames = collaborators.map((info) => info.name);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectEntry[]>([]);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load(): Promise<void> {
      const fetchedProject = await getProject(projectId);
      if (!fetchedProject) {
        if (!cancelled) setProject(null);
        return;
      }

      const uid = user!.uid;
      const isOwner = uid === fetchedProject.ownerUid;
      const isMember = isOwner || fetchedProject.memberUids.includes(uid);
      const otherMemberUids = fetchedProject.memberUids.filter((memberUid) => memberUid !== fetchedProject.ownerUid);

      // Each of these is a secondary section of the page (Interested,
      // Related) rather than the page itself — a failure here (e.g. a
      // security rule that hasn't been deployed yet) should degrade that one
      // section to empty, not take down the whole project page the way a
      // failure in the primary project/journal fetch correctly does.
      const [fetchedEntries, owner, collaboratorInfos, requests, related] = await Promise.all([
        getProjectJournalEntries(fetchedProject),
        getUserInfo(fetchedProject.ownerUid),
        getProjectMemberPreviews(otherMemberUids, 5),
        isOwner ? getJoinRequests(projectId).catch(() => []) : Promise.resolve([]),
        !isMember ? getRelatedProjects(fetchedProject, 2).catch(() => []) : Promise.resolve([]),
      ]);

      const relatedWithOwners = await Promise.all(
        related.map(async (relatedProject): Promise<RelatedProjectEntry> => {
          const relatedOwner = await getUserInfo(relatedProject.ownerUid);
          return { project: relatedProject, ownerName: relatedOwner.name };
        })
      );

      if (!cancelled) {
        setProject(fetchedProject);
        setEntries(fetchedEntries);
        setOwnerName(owner.name);
        setOwnerPhotoURL(owner.photoURL);
        setCollaborators(collaboratorInfos);
        setJoinRequests(requests);
        setRelatedProjects(relatedWithOwners);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load project:', error);
      if (!cancelled) setProject(null);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, user, reloadToken]);

  function handleChanged(): void {
    setReloadToken((token) => token + 1);
  }

  if (project === undefined) {
    return <p className="text-sm text-sand">Loading project…</p>;
  }
  if (project === null) {
    return <p className="text-sm text-oak">This project doesn&apos;t exist or isn&apos;t visible to you.</p>;
  }

  const isOwner = Boolean(user && user.uid === project.ownerUid);
  const isMember = isOwner || Boolean(user && project.memberUids.includes(user.uid));
  const isManager = Boolean(user && isProjectManager(project, user.uid));
  const visibleEntries = isMember || showAllEntries ? entries : entries.slice(0, VIEWER_INITIAL_ENTRY_COUNT);
  const hiddenEntryCount = entries.length - visibleEntries.length;

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        project={project}
        isOwner={isOwner}
        isMember={isMember}
        ownerName={ownerName}
        ownerPhotoURL={ownerPhotoURL}
        collaboratorNames={collaboratorNames}
        collaborators={collaborators}
        onProjectChanged={handleChanged}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {isMember && <ProjectJournalComposer project={project} onPosted={handleChanged} />}

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-ink">Build journal</h2>
            {entries.length === 0 && <p className="text-sm text-oak">No updates yet.</p>}
            <div className="flex flex-col gap-4">
              {visibleEntries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  canDelete={Boolean(user) && (entry.authorUid === user?.uid || isManager)}
                  onDeleted={handleChanged}
                />
              ))}
            </div>
            {!isMember && hiddenEntryCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllEntries(true)}
                className="self-center text-sm text-oak hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                — {hiddenEntryCount} more {hiddenEntryCount === 1 ? 'entry' : 'entries'} —{' '}
                <span className="text-deep-fresh">show all</span>
              </button>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 lg:w-64">
          <ProjectSidebar
            project={project}
            isOwner={isOwner}
            isMember={isMember}
            isManager={isManager}
            ownerName={ownerName}
            collaborators={collaborators}
            entryCount={entries.length}
            joinRequests={joinRequests}
            relatedProjects={relatedProjects}
            onProjectChanged={handleChanged}
            onJoinRequestResolved={handleChanged}
          />
        </aside>
      </div>
    </div>
  );
}
