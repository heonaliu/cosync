'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { accentClasses } from '@/lib/color';
import { db } from '@/lib/firebase';
import type { Club, DiscussionKind } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

type ClubComposerProps = {
  club: Club;
  onPosted: () => void;
};

// The single text field maps to `content`, not `title` — this is a quick
// post, not a two-part headline+body form. DiscussionCard already skips
// rendering the title line when it's empty.
export function ClubComposer({ club, onPosted }: ClubComposerProps) {
  const { user } = useAuth();
  const [kind, setKind] = useState<DiscussionKind>('discussion');
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { bg } = accentClasses(club.colorName);

  async function handlePost(): Promise<void> {
    if (!user || !content.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'clubs', club.id, 'discussions'), {
        authorUid: user.uid,
        title: '',
        content: content.trim(),
        kind,
        replyCount: 0,
        cheerCount: 0,
        createdAt: serverTimestamp(),
      });
      setContent('');
      setKind('discussion');
      onPosted();
    } catch (error) {
      console.error('Failed to post to club:', error);
      toast.error('Could not post. Try again.');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-card p-5', bg)}>
      <div className="flex items-center gap-2">
        <Avatar name={user?.displayName ?? user?.email ?? 'You'} size="sm" decorative />
        <span className="text-sm font-medium text-ink">Post to the club</span>
      </div>

      <Input
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start a discussion, share a build, or ask a question…"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <PillToggle label="Discussion" isActive={kind === 'discussion'} onClick={() => setKind('discussion')} />
          <PillToggle label="Event" isActive={kind === 'event'} onClick={() => setKind('event')} />
        </div>
        <Button type="button" disabled={isPosting || !content.trim()} onClick={() => void handlePost()}>
          {isPosting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
