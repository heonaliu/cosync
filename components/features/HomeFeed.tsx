'use client';

import { useEffect, useState } from 'react';

import { FeedFilterBar } from '@/components/features/FeedFilterBar';
import { JournalEntry } from '@/components/features/JournalEntry';
import { OpportunityCard } from '@/components/features/OpportunityCard';
import { ProjectCard } from '@/components/features/ProjectCard';
import { QuietProjectNudge } from '@/components/features/QuietProjectNudge';
import { getOpenOpportunities, getPublicProjects, getRecentJournalEntries } from '@/lib/queries';
import type { JournalEntry as JournalEntryData, Opportunity, Project } from '@/lib/types';

const QUIET_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

type FeedData = {
  entries: JournalEntryData[];
  projects: Project[];
  opportunities: Opportunity[];
};

export function HomeFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const [entries, projects, opportunities] = await Promise.all([
        getRecentJournalEntries(3).catch((error: unknown) => {
          console.error('Failed to load journal entries:', error);
          return [];
        }),
        getPublicProjects(5).catch((error: unknown) => {
          console.error('Failed to load projects:', error);
          return [];
        }),
        getOpenOpportunities(3).catch((error: unknown) => {
          console.error('Failed to load opportunities:', error);
          return [];
        }),
      ]);
      if (!cancelled) setData({ entries, projects, opportunities });
    }

    load().catch((error: unknown) => {
      console.error('Failed to load home feed:', error);
      if (!cancelled) setLoadError('Could not load the feed right now.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestEntry = data?.entries[0];
  const recommendedProject = data?.projects[0];
  const featuredOpportunity = data?.opportunities[0];
  const quietProject = data?.projects.find(
    (project) => Date.now() - project.updatedAt > QUIET_THRESHOLD_MS
  );
  const quietDays = quietProject
    ? Math.floor((Date.now() - quietProject.updatedAt) / (24 * 60 * 60 * 1000))
    : 0;

  const isEmpty = data && !latestEntry && !recommendedProject && !featuredOpportunity;

  return (
    <div className="flex flex-col gap-6">
      <FeedFilterBar />

      {!data && !loadError && <p className="text-sm text-sand">Loading your feed…</p>}
      {loadError && <p className="text-sm text-sand">{loadError}</p>}

      {isEmpty && (
        <div className="rounded-card bg-white p-6 text-sm text-oak">
          Nothing here yet — follow a few people or post your first project to get a feed going.
        </div>
      )}

      {latestEntry && <JournalEntry entry={latestEntry} />}

      {recommendedProject && (
        <ProjectCard
          project={recommendedProject}
          variant="feed"
          recommendationReason={
            recommendedProject.tags[0]
              ? `matches your ${recommendedProject.tags[0].toLowerCase()} interests`
              : undefined
          }
        />
      )}

      {featuredOpportunity && <OpportunityCard opportunity={featuredOpportunity} />}

      {quietProject && <QuietProjectNudge project={quietProject} quietDays={quietDays} />}
    </div>
  );
}
