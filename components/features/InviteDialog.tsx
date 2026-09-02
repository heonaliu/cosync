'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { sendProjectInvite } from '@/lib/notifications';
import { findUserByEmail, type UserInfo } from '@/lib/queries';
import { useAuth } from '@/lib/useAuth';

type InviteDialogProps = {
  projectId: string;
  projectTitle: string;
  /** Owner + every current collaborator's uid — blocks re-inviting someone
   * who's already on the project. */
  existingMemberUids: string[];
  trigger: React.ReactNode;
};

// Exact-match email lookup only, deliberately — see lib/queries.ts's
// findUserByEmail for why this isn't a live search-as-you-type.
export function InviteDialog({ projectId, projectTitle, existingMemberUids, trigger }: InviteDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  // undefined = haven't searched (or the email changed since the last
  // search). null = searched, no account found.
  const [result, setResult] = useState<UserInfo | null | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setEmail('');
    setResult(undefined);
    setError(null);
  }

  async function handleSearch(): Promise<void> {
    if (!email.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      setResult(await findUserByEmail(email));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Something went wrong.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleInvite(): Promise<void> {
    if (!user || !result) return;
    setIsSending(true);
    setError(null);
    try {
      await sendProjectInvite({
        projectId,
        projectTitle,
        inviterUid: user.uid,
        inviterName: user.displayName ?? 'Someone',
        inviteeUid: result.uid,
      });
      toast.success(`Invite sent to ${result.name}.`);
      setOpen(false);
      reset();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Could not send that invite.');
    } finally {
      setIsSending(false);
    }
  }

  const alreadyMember = result ? existingMemberUids.includes(result.uid) : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite a collaborator</DialogTitle>
          <DialogDescription>
            Enter their exact email — we&apos;ll check if they already have a CoSync account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setResult(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="them@example.com"
              aria-label="Email address"
            />
            <Button type="button" variant="outline" onClick={() => void handleSearch()} disabled={isSearching || !email.trim()}>
              {isSearching ? 'Searching…' : 'Find'}
            </Button>
          </div>

          {result === null && <p className="text-sm text-oak">No CoSync account found with that email.</p>}

          {result && (
            <div className="flex items-center gap-3 rounded-card bg-cream p-3">
              <Avatar name={result.name} photoURL={result.photoURL} size="sm" decorative />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">{result.name}</span>
                {alreadyMember && <span className="text-xs text-sand">Already on this project</span>}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!result || alreadyMember || isSending} onClick={() => void handleInvite()}>
            {isSending ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
