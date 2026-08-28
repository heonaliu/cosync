'use client';

import { useEffect, useState } from 'react';

import { FeedFilterBar, type FeedFilter } from '@/components/features/FeedFilterBar';
import { JournalEntry } from '@/components/features/JournalEntry';
import { OpportunityCard } from '@/components/features/OpportunityCard';
import { ProjectCard } from '@/components/features/ProjectCard';
import { QuietProjectNudge } from '@/components/features/QuietProjectNudge';
import { SetLocationDialog } from '@/components/features/SetLocationDialog';
import { Button } from '@/components/ui/button';
import { isNearbyMatch } from '@/lib/location';
import {
  getFollowedProjects,
  getLatestJournalEntry,
  getOpenOpportunities,
  getOpportunitiesByTags,
  getProjectsByTags,
  getPublicProjects,
  getRecentJournalEntries,
  getUserInfo,
  getUserInterests,
} from '@/lib/queries';
import type { JournalEntry as JournalEntryData, Opportunity, Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const QUIET_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;
// Bumped from the old fixed size of 3 — the Opportunities and Nearby tabs
// need an actual pool to list/filter, not just whatever a teaser fetch
// happened to grab.
const OPPORTUNITIES_FETCH_COUNT = 12;
// How many tag-matched projects/opportunities to pull in for "For you" —
// separate from OPPORTUNITIES_FETCH_COUNT since these are two different
// queries (interest-matched vs. every open opportunity).
const FOR_YOU_MATCH_COUNT = 8;
const FOR_YOU_MAX_ITEMS = 10;

type FollowingItem = {
  project: Project;
  latestEntry: JournalEntryData | null;
};

type FeedData = {
  entries: JournalEntryData[];
  projects: Project[];
  opportunities: Opportunity[];
  followingItems: FollowingItem[];
  interests: string[];
  matchedProjects: Project[];
  matchedOpportunities: Opportunity[];
};

// The three shapes a "For you" card can be, each carrying its own recency
// signal so the merged list can be sorted by one shared key regardless of
// which underlying collection it came from.
type ForYouItem =
  | { kind: 'entry'; sortKey: number; entry: JournalEntryData }
  | { kind: 'project'; sortKey: number; project: Project; reason?: string }
  | { kind: 'opportunity'; sortKey: number; opportunity: Opportunity; reason?: string };

export function HomeFeed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>('For you');
  const [data, setData] = useState<FeedData | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;

    async function load(): Promise<void> {
      const [entries, projects, opportunities, followedProjects, ownInfo] = await Promise.all([
        getRecentJournalEntries(3).catch((error: unknown) => {
          console.error('Failed to load journal entries:', error);
          return [];
        }),
        getPublicProjects(5).catch((error: unknown) => {
          console.error('Failed to load projects:', error);
          return [];
        }),
        getOpenOpportunities(OPPORTUNITIES_FETCH_COUNT).catch((error: unknown) => {
          console.error('Failed to load opportunities:', error);
          return [];
        }),
        getFollowedProjects(uid).catch((error: unknown) => {
          console.error('Failed to load followed projects:', error);
          return [];
        }),
        getUserInfo(uid).catch((error: unknown) => {
          console.error('Failed to load your profile:', error);
          return { name: 'You', verified: false, role: null, school: null, location: null };
        }),
      ]);

      // Following's "updates" are each followed project's latest journal
      // entry — a genuinely different read than anything the default feed
      // fetches, not a client-side re-filter of `entries` (which is a
      // global cross-project feed, unscoped to who you follow).
      const followingItems = await Promise.all(
        followedProjects.map(
          async (project): Promise<FollowingItem> => ({
            project,
            latestEntry: await getLatestJournalEntry(project).catch(() => null),
          })
        )
      );

      // Interests come from the onboarding survey. getProjectsByTags/
      // getOpportunitiesByTags both no-op to [] when interests is empty
      // (Firestore rejects an empty array-contains-any filter), which is
      // exactly the "skipped onboarding" fallback case "For you" needs.
      const interests = await getUserInterests(uid).catch((error: unknown) => {
        console.error('Failed to load your interests:', error);
        return [];
      });
      const [matchedProjects, matchedOpportunities] = await Promise.all([
        getProjectsByTags(interests, FOR_YOU_MATCH_COUNT).catch((error: unknown) => {
          console.error('Failed to load matched projects:', error);
          return [];
        }),
        getOpportunitiesByTags(interests, FOR_YOU_MATCH_COUNT).catch((error: unknown) => {
          console.error('Failed to load matched opportunities:', error);
          return [];
        }),
      ]);

      if (!cancelled) {
        setData({ entries, projects, opportunities, followingItems, interests, matchedProjects, matchedOpportunities });
        setUserLocation(ownInfo.location);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load home feed:', error);
      if (!cancelled) setLoadError('Could not load the feed right now.');
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const quietProject = data?.projects.find(
    (project) => Date.now() - project.updatedAt > QUIET_THRESHOLD_MS
  );
  const quietDays = quietProject
    ? Math.floor((Date.now() - quietProject.updatedAt) / (24 * 60 * 60 * 1000))
    : 0;

  // "For you" = a real mix of (a) updates from projects you follow, (b)
  // other public projects whose tags overlap your interests, and (c)
  // opportunities whose tags overlap your interests — merged into one list
  // and sorted by whichever's most recent, not three separate rigid blocks.
  // A followed project that also happens to match an interest only shows
  // once (as its update), and nothing recommends your own project or
  // opportunity back to you.
  const followedProjectIds = new Set(data?.followingItems.map(({ project }) => project.id));
  const forYouItems: ForYouItem[] = data
    ? [
        ...data.followingItems.map(
          ({ project, latestEntry }): ForYouItem =>
            latestEntry
              ? { kind: 'entry', sortKey: latestEntry.createdAt, entry: latestEntry }
              : { kind: 'project', sortKey: project.updatedAt, project, reason: 'a project you follow' }
        ),
        ...data.matchedProjects
          .filter((project) => !followedProjectIds.has(project.id) && project.ownerUid !== user?.uid)
          .map((project): ForYouItem => {
            // The tag that actually got this project matched — not just
            // tags[0], which could easily be a tag the viewer has no
            // interest in at all if their real match was tags[1] or later.
            const matchedTag = project.tags.find((tag) => data.interests.includes(tag));
            return {
              kind: 'project',
              sortKey: project.updatedAt,
              project,
              reason: matchedTag ? `matches your ${matchedTag.toLowerCase()} interest` : undefined,
            };
          }),
        ...data.matchedOpportunities
          .filter((opportunity) => opportunity.posterUid !== user?.uid)
          .map((opportunity): ForYouItem => {
            const matchedTag = opportunity.tags.find((tag) => data.interests.includes(tag));
            return {
              kind: 'opportunity',
              sortKey: opportunity.createdAt,
              opportunity,
              reason: matchedTag ? `matches your ${matchedTag.toLowerCase()} interest` : undefined,
            };
          }),
      ]
        .sort((a, b) => b.sortKey - a.sortKey)
        .slice(0, FOR_YOU_MAX_ITEMS)
    : [];

  // Only reached when the personalized mix above is empty (no follows, no
  // interests set, or interests that don't match anything yet) — falls back
  // to the same "what's new globally" defaults the app showed before
  // personalization existed, so skipping onboarding doesn't mean a blank tab.
  const fallbackEntry = data?.entries[0];
  const fallbackProject = data?.projects[0];
  const fallbackOpportunity = data?.opportunities[0];
  const hasFallback = Boolean(fallbackEntry || fallbackProject || fallbackOpportunity);

  // Opportunities/Nearby don't run their own query — they re-slice the same
  // `data.opportunities` array already fetched, just with a bigger page
  // size than "For you" alone would ever need.
  const nearbyOpportunities =
    data && userLocation ? data.opportunities.filter((o) => isNearbyMatch(userLocation, o.location)) : [];

  return (
    <div className="flex flex-col gap-6">
      <FeedFilterBar active={filter} onChange={setFilter} />

      {!data && !loadError && <p className="text-sm text-sand">Loading your feed…</p>}
      {loadError && <p className="text-sm text-sand">{loadError}</p>}

      {data && filter === 'For you' && (
        <>
          {forYouItems.length === 0 && !hasFallback && (
            <div className="rounded-card bg-white p-6 text-sm text-oak">
              Nothing here yet — follow a few people or post your first project to get a feed going.
            </div>
          )}
          {forYouItems.length > 0
            ? forYouItems.map((item) => {
                switch (item.kind) {
                  case 'entry':
                    return <JournalEntry key={`entry-${item.entry.id}`} entry={item.entry} />;
                  case 'project':
                    return (
                      <ProjectCard
                        key={`project-${item.project.id}`}
                        project={item.project}
                        variant="feed"
                        recommendationReason={item.reason}
                      />
                    );
                  case 'opportunity':
                    return (
                      <OpportunityCard
                        key={`opportunity-${item.opportunity.id}`}
                        opportunity={item.opportunity}
                        recommendationReason={item.reason}
                      />
                    );
                }
              })
            : hasFallback && (
                <>
                  {fallbackEntry && <JournalEntry entry={fallbackEntry} />}
                  {fallbackProject && <ProjectCard project={fallbackProject} variant="feed" />}
                  {fallbackOpportunity && <OpportunityCard opportunity={fallbackOpportunity} />}
                </>
              )}
        </>
      )}

      {data && filter === 'Following' && (
        <>
          {data.followingItems.length === 0 && (
            <div className="rounded-card bg-white p-6 text-sm text-oak">
              You&apos;re not following any projects yet — open one and tap &quot;+ Follow
              project&quot; to see its updates here.
            </div>
          )}
          {data.followingItems.map(({ project, latestEntry: entry }) =>
            entry ? (
              <JournalEntry key={project.id} entry={entry} />
            ) : (
              <ProjectCard key={project.id} project={project} variant="feed" />
            )
          )}
        </>
      )}

      {data && filter === 'Opportunities' && (
        <>
          {data.opportunities.length === 0 && (
            <div className="rounded-card bg-white p-6 text-sm text-oak">
              No open opportunities right now — check back soon.
            </div>
          )}
          {data.opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </>
      )}

      {data && filter === 'Nearby' && (
        <>
          {!userLocation ? (
            <div className="flex flex-col items-start gap-3 rounded-card bg-white p-6 text-sm text-oak">
              <p>Add your city and we&apos;ll show you what&apos;s happening nearby.</p>
              <SetLocationDialog
                onSaved={(location) => setUserLocation(location)}
                trigger={
                  <Button type="button" size="sm">
                    Add your location
                  </Button>
                }
              />
            </div>
          ) : nearbyOpportunities.length === 0 ? (
            <div className="rounded-card bg-white p-6 text-sm text-oak">
              Nothing near {userLocation} yet — check back soon.
            </div>
          ) : (
            nearbyOpportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)
          )}
        </>
      )}

      {quietProject && <QuietProjectNudge project={quietProject} quietDays={quietDays} />}
    </div>
  );
}
