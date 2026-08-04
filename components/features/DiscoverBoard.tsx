'use client';

import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';

import { ProjectCard } from '@/components/features/ProjectCard';
import { Button } from '@/components/ui/button';
import { PillToggle } from '@/components/ui/PillToggle';
import type { ProjectStage, ProjectWithStats } from '@/lib/types';

const CATEGORIES = ['All', 'Hardware', 'Software', 'AI/ML', 'Robotics', 'Music', 'Writing'] as const;

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
  { value: 'lookingForTeam', label: 'Looking for team' },
];

type DiscoverBoardProps = {
  projects: ProjectWithStats[];
};

export function DiscoverBoard({ projects }: DiscoverBoardProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [stage, setStage] = useState<StageFilterValue | null>(null);

  const filteredProjects = projects.filter((project) => {
    const acceptedTags = CATEGORY_TAGS[category] ?? [category];
    const categoryMatch = category === 'All' || acceptedTags.some((tag) => project.tags.includes(tag));
    const stageMatch =
      stage === null
        ? true
        : stage === 'lookingForTeam'
          ? Boolean(project.lookingFor)
          : project.stage === stage;
    return categoryMatch && stageMatch;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-pill bg-white p-2">
        <div className="flex flex-1 items-center gap-2 px-3">
          <IconSearch className="size-5 shrink-0 text-sand" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects, tags, people"
            aria-label="Search projects, tags, people"
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-sand"
          />
        </div>
        <Button size="lg" className="shrink-0">
          Search
        </Button>
      </div>

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

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} entryCount={project.journalEntryCount} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-oak">No projects match these filters yet.</p>
      )}
    </div>
  );
}
