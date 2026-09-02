'use client';

import { IconExternalLink, IconSettings, IconShare } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { EditProjectDialog } from '@/components/features/EditProjectDialog';
import { ProjectTeamModal } from '@/components/features/ProjectTeamModal';
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
import { isProjectManager } from '@/lib/projectRoles';
import type { UserInfo } from '@/lib/queries';
import { formatNameList, formatRelativeTime } from '@/lib/time';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useFollowProject } from '@/lib/useFollowProject';

type ProjectHeaderProps = {
  project: Project;
  isOwner: boolean;
  isMember: boolean;
  ownerName: string;
  ownerPhotoURL: string | null;
  collaboratorNames: string[];
  collaborators: UserInfo[];
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
  ownerPhotoURL,
  collaboratorNames,
  collaborators,
  onProjectChanged,
}: ProjectHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useFollowProject(project);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const isManager = Boolean(user && isProjectManager(project, user.uid));

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

      {project.stage === 'launched' && project.liveUrl && (
        <Link
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-sage px-3 py-1.5 text-sm font-medium text-deep-fresh hover:underline"
        >
          <IconExternalLink className="size-4" aria-hidden="true" />
          Visit live site
        </Link>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTeamModalOpen(true)}
          aria-label="See who's working on this project"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          <AvatarStack names={avatarNames} size="sm" />
        </button>
        <p className="text-sm text-sand">
          {namesLine} · started {formatRelativeTime(project.createdAt)} · {project.followerCount} following
        </p>
      </div>

      <ProjectTeamModal
        project={project}
        ownerName={ownerName}
        ownerPhotoURL={ownerPhotoURL}
        collaborators={collaborators}
        isManager={isManager}
        open={teamModalOpen}
        onOpenChange={setTeamModalOpen}
        onChanged={onProjectChanged}
      />
    </div>
  );
}
