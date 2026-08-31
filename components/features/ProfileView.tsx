'use client';

import { IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EditProfileDialog } from '@/components/features/EditProfileDialog';
import { FollowListDialog } from '@/components/features/FollowListDialog';
import { ProjectCard } from '@/components/features/ProjectCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import {
  getFollowerCount,
  getFollowers,
  getFollowing,
  getFollowingCount,
  getOwnedProjects,
  getPublicProjectsByOwner,
  getUserInfo,
  getUserInterests,
  type UserInfo,
} from '@/lib/queries';
import { formatShortName } from '@/lib/profile';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useFollowUser } from '@/lib/useFollowUser';

type ProfileViewProps = {
  uid: string;
};

const VISIBILITY_LABELS: Record<Project['visibility'], string> = {
  public: 'Public',
  unlisted: 'Unlisted',
  draft: 'Draft',
};

export function ProfileView({ uid }: ProfileViewProps) {
  const { user } = useAuth();
  const isOwnProfile = user?.uid === uid;

  const [info, setInfo] = useState<UserInfo | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [projects, setProjects] = useState<Project[] | null>(null);

  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useFollowUser(uid);

  useEffect(() => {
    let cancelled = false;

    // isOwnProfile decides which query runs, not just which UI renders —
    // getPublicProjectsByOwner filters visibility=='public' in the query
    // itself, so another viewer's request never returns a private/unlisted
    // project in the first place, regardless of what the page then does
    // with the result.
    //
    // Each fetch is caught individually, not one Promise.all — the follows
    // collection is new and needs its own security rules deployed
    // separately from this app's code, so until that happens, a
    // permission-denied there should degrade the follower/following counts
    // to 0 rather than taking the whole profile down with it.
    async function load(): Promise<void> {
      const [fetchedInfo, fetchedInterests, followers, following, fetchedProjects] = await Promise.all([
        getUserInfo(uid),
        getUserInterests(uid).catch((error: unknown) => {
          console.error('Failed to load interests:', error);
          return [];
        }),
        getFollowerCount(uid).catch((error: unknown) => {
          console.error('Failed to load follower count:', error);
          return 0;
        }),
        getFollowingCount(uid).catch((error: unknown) => {
          console.error('Failed to load following count:', error);
          return 0;
        }),
        (isOwnProfile ? getOwnedProjects(uid) : getPublicProjectsByOwner(uid)).catch((error: unknown) => {
          console.error('Failed to load projects:', error);
          return [];
        }),
      ]);

      if (!cancelled) {
        setInfo(fetchedInfo);
        setInterests(fetchedInterests);
        setFollowerCount(followers);
        setFollowingCount(following);
        setProjects(fetchedProjects);
      }
    }

    load().catch((error: unknown) => console.error('Failed to load profile:', error));

    return () => {
      cancelled = true;
    };
  }, [uid, isOwnProfile]);

  async function handleFollowClick(): Promise<void> {
    const wasFollowing = isFollowing;
    try {
      await toggleFollow();
      setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    } catch (error) {
      console.error('Failed to update follow state:', error);
      toast.error('Could not update follow state. Try again.');
    }
  }

  function handleProfileSaved({ displayName, interests: nextInterests }: { displayName: string; interests: string[] }): void {
    setInfo((previous) => (previous ? { ...previous, name: displayName } : previous));
    setInterests(nextInterests);
  }

  if (!info) {
    return <p className="text-sm text-sand">Loading profile…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-card bg-white p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={info.name} photoURL={info.photoURL} size="lg" decorative />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-medium text-ink">{formatShortName(info.name)}</h1>

            <div className="flex flex-wrap items-center gap-2">
              <Chip label={info.role === 'educator' ? 'Educator' : 'Student'} color={info.role === 'educator' ? 'lilac' : 'sage'} />
              {info.role === 'educator' && info.verified && (
                <span className="inline-flex items-center gap-1 text-sm text-deep-fresh">
                  <IconShieldCheck className="size-4" aria-hidden="true" />
                  Verified
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-oak">
              <FollowListDialog
                title="Followers"
                fetchList={() => getFollowers(uid)}
                trigger={
                  <button
                    type="button"
                    className="rounded-[4px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                  >
                    <span className="font-medium text-ink">{followerCount}</span> followers
                  </button>
                }
              />
              <FollowListDialog
                title="Following"
                fetchList={() => getFollowing(uid)}
                trigger={
                  <button
                    type="button"
                    className="rounded-[4px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                  >
                    <span className="font-medium text-ink">{followingCount}</span> following
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {isOwnProfile ? (
          <EditProfileDialog
            uid={uid}
            currentDisplayName={info.name}
            currentInterests={interests}
            onSaved={handleProfileSaved}
            trigger={
              <Button type="button" variant="outline" size="sm">
                Edit
              </Button>
            }
          />
        ) : (
          <Button
            type="button"
            variant={isFollowing ? 'dark' : 'default'}
            size="sm"
            disabled={isFollowLoading}
            onClick={() => void handleFollowClick()}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">Interests</h2>
        {isOwnProfile ? (
          <EditProfileDialog
            uid={uid}
            currentDisplayName={info.name}
            currentInterests={interests}
            onSaved={handleProfileSaved}
            trigger={
              <button
                type="button"
                className="flex flex-wrap gap-2 rounded-card bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                {interests.length > 0 ? (
                  interests.map((tag) => <Chip key={tag} label={tag} />)
                ) : (
                  <span className="text-sm text-sand">Add a few interests so people know what you&apos;re into.</span>
                )}
              </button>
            }
          />
        ) : interests.length > 0 ? (
          <div className="flex flex-wrap gap-2 rounded-card bg-white p-4">
            {interests.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-sand">No interests listed yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">Current projects</h2>
        {projects === null && <p className="text-sm text-sand">Loading projects…</p>}
        {projects?.length === 0 && (
          <p className="text-sm text-oak">
            {isOwnProfile ? "You haven't started a project yet." : "Nothing public here yet."}
          </p>
        )}
        {projects && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="relative">
                {isOwnProfile && (
                  <Chip
                    label={VISIBILITY_LABELS[project.visibility]}
                    className="absolute top-3 right-3 z-10"
                  />
                )}
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
