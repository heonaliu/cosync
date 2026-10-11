'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { joinClubByCode } from '@/lib/clubInvites';
import { useAuth } from '@/lib/useAuth';

// For invite-only clubs and school-only clubs at another school — the
// admin shares the code (see ClubJoinCodeDialog) and it's typed in here.
export function JoinClubByCodeDialog() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      setCode('');
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !code.trim()) return;
    setIsJoining(true);
    setError(null);
    try {
      const clubId = await joinClubByCode(user.uid, code);
      if (!clubId) {
        setError("That code doesn't match any club. Check it with the club's admin.");
        return;
      }
      setOpen(false);
      toast.success('You joined the club!');
      router.push(`/clubs/${clubId}`);
    } catch (joinError) {
      console.error('Failed to join club by code:', joinError);
      setError('Could not join with that code. It may have changed — ask the admin for the current one.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg">
          Join club via code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join club via code</DialogTitle>
          <DialogDescription>Enter the 8-character code a club admin gave you.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <Input
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. K7QM2XPA"
            aria-label="Club code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={16}
            className="font-mono uppercase tracking-widest"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isJoining}>
              Cancel
            </Button>
            <Button type="submit" disabled={isJoining || !code.trim()}>
              {isJoining ? 'Joining…' : 'Join club'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
