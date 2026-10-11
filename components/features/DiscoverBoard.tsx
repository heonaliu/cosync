'use client';

import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { ProjectCard } from '@/components/features/ProjectCard';
import { Button } from '@/components/ui/button';
import { PillToggle } from '@/components/ui/PillToggle';
import { getDiscoverProjects } from '@/lib/queries';
import { PROJECT_CATEGORY_TAGS } from '@/lib/tags';
import type { ProjectStage, ProjectWithStats } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const CATEGORIES = ['All', ...PROJECT_CATEGORY_TAGS] as const;

// The filter pill says "AI/ML" but a project's own tags array just says
// "AI" (see the ArtBot card) — this maps each filter label to the tag
// value(s) it should actually match against.
const CATEGORY_TAGS: Record<string, string[]> = {
  'AI/ML': ['AI', 'AI/ML', 'ML'],
};

type StageFilterValue = ProjectStage | 'lookingForTeam';

const STAGES: { value: StageFilterValue; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'prototyping', label: 'Prototyping' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'launched', label: 'Launched' },
  { value: 'lookingForTeam', label: 'Looking for team' },
];

function matchesSearch(project: ProjectWithStats, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [project.title, project.pitch, project.description, ...project.tags].some((text) =>
    text.toLowerCase().includes(needle)
  );
}

export function DiscoverBoard() {
  const { user } = useAuth();
  // null = still loading
  const [projects, setProjects] = useState<ProjectWithStats[] | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [stage, setStage] = useState<StageFilterValue | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDiscoverProjects(user.uid)
      .then((result) => {
        if (!cancelled) setProjects(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load discover projects:', error);
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredProjects = (projects ?? []).filter((project) => {
    if (!matchesSearch(project, search)) return false;
    const acceptedTags = CATEGORY_TAGS[category] ?? [category];
    const categoryMatch = category === 'All' || acceptedTags.some((tag) => project.tags.includes(tag));
    const stageMatch =
      stage === null
        ? true
        : stage === 'lookingForTeam'
          ? Boolean(project.lookingFor?.length)
          : project.stage === stage;
    return categoryMatch && stageMatch;
  });

  return (
    <div className="flex flex-col gap-6">
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex items-center gap-2 rounded-pill bg-white p-2"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <IconSearch className="size-5 shrink-0 text-sand" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects and tags"
            aria-label="Search projects and tags"
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-sand"
          />
        </div>
        <Button type="submit" size="lg" className="shrink-0">
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category filters">
          {CATEGORIES.map((value) => (
            <PillToggle
              key={value}
              label={value}
              isActive={category === value}
              activeColor="purple"
              onClick={() => setCategory(value)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Stage filters">
          <span className="text-sm text-sand">Stage:</span>
          {STAGES.map((item) => (
            <PillToggle
              key={item.value}
              label={item.label}
              isActive={stage === item.value}
              activeColor="amber"
              onClick={() => setStage((current) => (current === item.value ? null : item.value))}
            />
          ))}
        </div>
      </div>

      {projects === null ? (
        <p className="text-sm text-sand">Loading projects…</p>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              entryCount={project.journalEntryCount}
              team={{ ownerName: project.ownerName, collaboratorNames: project.collaboratorNames }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-oak">
          {projects.length === 0
            ? 'Nothing from other makers yet — check back soon, or share yours so they can find it.'
            : 'Nothing matches that combo yet. Try loosening a filter or two.'}
        </p>
      )}
    </div>
  );
}
