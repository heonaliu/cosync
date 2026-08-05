'use client';

import { useEffect, useState } from 'react';

import { MyProjectCard } from '@/components/features/MyProjectCard';
import { NewProjectDialog } from '@/components/features/NewProjectDialog';
import { PillToggle } from '@/components/ui/PillToggle';
import {
  getContributingProjects,
  getLatestJournalEntry,
  getOwnedProjects,
  getProjectJournalEntryCount,
  getProjectMemberPreviews,
  getUserInfo,
} from '@/lib/queries';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const FILTERS = ['All', 'Owned', 'Contributing', 'Drafts'] as const;
type Filter = (typeof FILTERS)[number];

type OwnedEntry = {
  project: Project;
  memberPreviewNames: string[];
  entryCount: number;
  latestEntryPreview?: string;
};

type ContributingEntry = {
  project: Project;
  ownerName: string;
};

export function ProjectsBoard() {
  const { user } = useAuth();
  const [owned, setOwned] = useState<OwnedEntry[] | null>(null);
  const [contributing, setContributing] = useState<ContributingEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;

    async function load(): Promise<void> {
      const [ownedProjects, contributingProjects] = await Promise.all([
        getOwnedProjects(uid),
        getContributingProjects(uid),
      ]);

      const ownedWithActivity = await Promise.all(
        ownedProjects.map(async (project): Promise<OwnedEntry> => {
          if (project.visibility === 'draft') {
            return { project, memberPreviewNames: [], entryCount: 0 };
          }
          const [memberPreviews, entryCount, latestEntry] = await Promise.all([
            getProjectMemberPreviews(project.memberUids, 3),
            getProjectJournalEntryCount(project.id),
            getLatestJournalEntry(project).catch(() => null),
          ]);
          return {
            project,
            memberPreviewNames: memberPreviews.map((info) => info.name),
            entryCount,
            latestEntryPreview: latestEntry?.content,
          };
        })
      );

      const contributingWithOwner = await Promise.all(
        contributingProjects.map(async (project): Promise<ContributingEntry> => {
          const owner = await getUserInfo(project.ownerUid);
          return { project, ownerName: owner.name };
        })
      );

      if (!cancelled) {
        setOwned(ownedWithActivity);
        setContributing(contributingWithOwner);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load projects:', error);
      if (!cancelled) {
        setOwned([]);
        setContributing([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, reloadToken]);

  if (!owned || !contributing) {
    return <p className="text-sm text-sand">Loading your projects…</p>;
  }

  const activeCount = owned.filter((entry) => entry.project.visibility !== 'draft').length;
  const draftCount = owned.filter((entry) => entry.project.visibility === 'draft').length;

  const showOwned = filter === 'All' || filter === 'Owned';
  const showContributing = filter === 'All' || filter === 'Contributing';
  const ownedToShow = filter === 'Drafts' ? owned.filter((entry) => entry.project.visibility === 'draft') : owned;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-medium text-ink">Your projects</h1>
          <p className="text-sm text-sand">
            {activeCount} active · {draftCount} draft · contributing to {contributing.length}
          </p>
        </div>
        <NewProjectDialog onCreated={() => setReloadToken((token) => token + 1)} />
      </div>

      <div role="group" aria-label="Project filters" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <PillToggle
            key={item}
            label={item}
            isActive={filter === item}
            activeColor="purple"
            onClick={() => setFilter(item)}
          />
        ))}
      </div>

      {(showOwned || filter === 'Drafts') && ownedToShow.length > 0 && (
        <section className="flex flex-col gap-4">
          {filter !== 'Drafts' && <h2 className="text-sm font-medium text-sand">Owned by you</h2>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ownedToShow.map(({ project, memberPreviewNames, entryCount, latestEntryPreview }) => (
              <MyProjectCard
                key={project.id}
                kind="owned"
                project={project}
                memberPreviewNames={memberPreviewNames}
                entryCount={entryCount}
                latestEntryPreview={latestEntryPreview}
              />
            ))}
          </div>
        </section>
      )}

      {showContributing && contributing.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-sand">Contributing to</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {contributing.map(({ project, ownerName }) => (
              <MyProjectCard key={project.id} kind="contributing" project={project} ownerName={ownerName} />
            ))}
          </div>
        </section>
      )}

      {filter === 'Drafts' && ownedToShow.length === 0 && (
        <p className="text-sm text-oak">No draft projects — nice, everything you own is published.</p>
      )}
      {filter === 'Owned' && owned.length === 0 && (
        <p className="text-sm text-oak">You haven&apos;t started a project yet — hit &quot;+ New project&quot; above.</p>
      )}
      {filter === 'Contributing' && contributing.length === 0 && (
        <p className="text-sm text-oak">You&apos;re not collaborating on anyone else&apos;s project yet.</p>
      )}
    </div>
  );
}
