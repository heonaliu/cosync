'use client';

import { IconSettings, IconShare } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { EditProjectDialog } from '@/components/features/EditProjectDialog';
import { ReportButton } from '@/components/features/ReportButton';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STAGE_LABELS, stageColorFor } from '@/lib/color';
import { db } from '@/lib/firebase';
import { formatNameList, formatRelativeTime } from '@/lib/time';
import type { Project } from '@/lib/types';
import { useFollowProject } from '@/lib/useFollowProject';

type ProjectHeaderProps = {
  project: Project;
  isOwner: boolean;
  isMember: boolean;
  ownerName: string;
  collaboratorNames: string[];
  onProjectChanged: () => void;
};

async function copyProjectLink(message: string): Promise<void> {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title: document.title, url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(url);
  toast.success(message);
}

export function ProjectHeader({
  project,
  isOwner,
  isMember,
  ownerName,
  collaboratorNames,
  onProjectChanged,
}: ProjectHeaderProps) {
  const router = useRouter();
  const { isFollowing, toggleFollow } = useFollowProject(project);

  const avatarNames = [ownerName, ...collaboratorNames];
  const namesLine = isMember
    ? formatNameList([`${ownerName} (owner)`, ...collaboratorNames])
    : formatNameList(avatarNames);

  async function handleDeleteProject(): Promise<void> {
    await deleteDoc(doc(db, 'projects', project.id));
    router.push('/projects');
  }

  async function handleToggleFollow(): Promise<void> {
    try {
      await toggleFollow();
    } catch (error) {
      console.error('Failed to follow project:', error);
      toast.error('Could not follow this project. Try again.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-sand">
        {isMember ? (
          <>
            <Link href="/projects" className="hover:text-ink">
              Projects
            </Link>
            <span aria-hidden="true">›</span>
            <Link href="/projects" className="hover:text-ink">
              {isOwner ? 'Owned' : 'Contributing'}
            </Link>
          </>
        ) : (
          <>
            <Link href="/discover" className="hover:text-ink">
              Discover
            </Link>
            <span aria-hidden="true">›</span>
            <Link href="/discover" className="hover:text-ink">
              {project.tags[0] ?? 'Projects'}
            </Link>
          </>
        )}
        <span aria-hidden="true">›</span>
        <span className="text-ink">{project.title}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {project.tags.map((tag) => (
          <Chip key={tag} label={tag} />
        ))}
        <Chip label={STAGE_LABELS[project.stage]} color={stageColorFor(project.stage)} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-[22px] font-medium text-ink">{project.title}</h1>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyProjectLink('Link copied!')}>
            <IconShare className="size-4" aria-hidden="true" />
            Share
          </Button>

          {isOwner ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <IconSettings className="size-4" aria-hidden="true" />
                    Settings
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        Delete project
                      </DropdownMenuItem>
                    }
                    title="Delete this project?"
                    description="This removes the project and its journal for everyone. This can't be undone."
                    confirmLabel="Delete"
                    onConfirm={handleDeleteProject}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <EditProjectDialog
                project={project}
                onSaved={onProjectChanged}
                trigger={<Button type="button">Edit project</Button>}
              />
            </>
          ) : isMember ? null : (
            <>
              <ReportButton kind="project" sourceRef={project.id} label="project" variant="button" />
              <Button type="button" onClick={() => void handleToggleFollow()}>
                {isFollowing ? 'Following' : '+ Follow project'}
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="max-w-2xl text-sm text-oak">{project.description}</p>

      <div className="flex items-center gap-3">
        <AvatarStack names={avatarNames} size="sm" />
        <p className="text-sm text-sand">
          {namesLine} · started {formatRelativeTime(project.createdAt)}
          {!isMember && ` · ${project.followerCount} following`}
        </p>
      </div>
    </div>
  );
}
