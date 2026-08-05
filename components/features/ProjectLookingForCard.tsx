'use client';

import { IconPencil } from '@tabler/icons-react';
import { toast } from 'sonner';

import { EditLookingForDialog } from '@/components/features/EditLookingForDialog';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';
import { useAskToJoinProject } from '@/lib/useJoinProjectRequest';

type ProjectLookingForCardProps = {
  project: Project;
  isOwner: boolean;
  isMember: boolean;
  onProjectChanged: () => void;
};

export function ProjectLookingForCard({ project, isOwner, isMember, onProjectChanged }: ProjectLookingForCardProps) {
  const { hasRequested, ask } = useAskToJoinProject(project.id);

  async function handleAsk(): Promise<void> {
    try {
      await ask();
    } catch (error) {
      console.error('Failed to send join request:', error);
      toast.error('Could not send that request. Try again.');
    }
  }

  if (!project.lookingFor) {
    if (!isOwner) return null;
    return (
      <EditLookingForDialog
        project={project}
        onSaved={onProjectChanged}
        trigger={
          <button
            type="button"
            className="rounded-card border border-dashed border-olive p-4 text-left text-sm text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
          >
            + Add what you&apos;re looking for
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-amber p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-deep-amber">Looking for</h2>
        {isOwner && (
          <EditLookingForDialog
            project={project}
            onSaved={onProjectChanged}
            trigger={
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit looking for" className="text-deep-amber hover:bg-white/40 hover:text-deep-amber">
                <IconPencil className="size-4" />
              </Button>
            }
          />
        )}
      </div>
      <p className="text-sm font-medium text-ink">{project.lookingFor.role}</p>
      {project.lookingFor.description && <p className="text-sm text-deep-amber/80">{project.lookingFor.description}</p>}

      {!isMember && (
        <Button
          type="button"
          variant="dark"
          className="mt-1 self-start"
          disabled={hasRequested !== false}
          onClick={() => void handleAsk()}
        >
          {hasRequested ? 'Requested' : 'Ask to join'}
        </Button>
      )}
    </div>
  );
}
