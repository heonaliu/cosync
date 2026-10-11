'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildClubInviteUrl, getOrCreateClubInviteCode } from '@/lib/clubInvites';
import type { Club } from '@/lib/types';

type ClubJoinCodeDialogProps = {
  club: Club;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Admin-only, from ClubHeader's ⋮ menu. The code is what people type into
// "Join club via code" on the Clubs page; the link carries the same code.
export function ClubJoinCodeDialog({ club, open, onOpenChange }: ClubJoinCodeDialogProps) {
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || code) return;
    let cancelled = false;
    getOrCreateClubInviteCode(club.id)
      .then((nextCode) => {
        if (!cancelled) setCode(nextCode);
      })
      .catch((error: unknown) => {
        console.error('Failed to load join code:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, code, club.id]);

  async function copy(text: string, message: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join code</DialogTitle>
          <DialogDescription>
            {club.access === 'schoolOnly'
              ? `Students at ${club.schoolName ?? 'your school'} can join without it. Share it with anyone else you want to let in.`
              : 'Share it with people you want to let in. They enter it under Join club via code on the Clubs page.'}
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <p className="text-sm text-destructive">Could not load the code. Try again.</p>
        ) : code ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-card border border-olive bg-cream py-4 text-center font-mono text-2xl tracking-[0.3em] text-ink">
              {code}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => void copy(code, 'Code copied!')}>
                Copy code
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => void copy(buildClubInviteUrl(club.id, code), 'Invite link copied!')}
              >
                Copy invite link
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-sand">Loading code…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
