'use client';

import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import type { JoinRequest } from '@/lib/types';
import { useResolveJoinRequest } from '@/lib/useJoinProjectRequest';

type ProjectInterestedListProps = {
  projectId: string;
  requests: JoinRequest[];
  onResolved: () => void;
};

// Owner-only — reads projects/{id}/joinRequests where status == 'pending'.
// Accept adds the uid to memberUids (so their next visit to this page
// renders as a collaborator, not a viewer) and deletes the request; Decline
// just deletes it. See firestore.rules and useJoinProjectRequest for why
// deleting rather than marking resolved.
export function ProjectInterestedList({ projectId, requests, onResolved }: ProjectInterestedListProps) {
  const { accept, decline } = useResolveJoinRequest(projectId);

  if (requests.length === 0) return null;

  async function handleAccept(uid: string): Promise<void> {
    try {
      await accept(uid);
      onResolved();
    } catch (error) {
      console.error('Failed to accept join request:', error);
      toast.error('Could not accept that request. Try again.');
    }
  }

  async function handleDecline(uid: string): Promise<void> {
    try {
      await decline(uid);
      onResolved();
    } catch (error) {
      console.error('Failed to decline join request:', error);
      toast.error('Could not decline that request. Try again.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink">Interested ({requests.length})</h2>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li key={request.uid} className="flex items-center justify-between gap-2 rounded-card border border-olive bg-white p-3">
            <div className="flex items-center gap-2">
              <Avatar name={request.name} size="sm" decorative />
              <span className="text-sm text-ink">{request.name}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void handleAccept(request.uid)}>
                Accept
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleDecline(request.uid)}>
                Decline
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
