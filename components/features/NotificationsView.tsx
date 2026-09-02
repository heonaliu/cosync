'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { acceptProjectInvite, declineProjectInvite, getNotifications, markNotificationSeen } from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/time';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

export function NotificationsView() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getNotifications(user.uid)
      .then((result) => {
        if (cancelled) return;
        setNotifications(result);
        // The avatar dot is what flags "something's new" — once someone's
        // actually looking at this list, every unseen item in it is seen.
        result.filter((notification) => !notification.seen).forEach((notification) => {
          void markNotificationSeen(user.uid, notification.id).catch((error: unknown) =>
            console.error('Failed to mark notification seen:', error)
          );
        });
      })
      .catch((error: unknown) => {
        console.error('Failed to load notifications:', error);
        if (!cancelled) setNotifications([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleAccept(notification: Notification): Promise<void> {
    if (!user) return;
    setBusyId(notification.id);
    try {
      await acceptProjectInvite({ projectId: notification.sourceRef, uid: user.uid, notificationId: notification.id });
      setNotifications((previous) => previous?.filter((item) => item.id !== notification.id) ?? null);
      toast.success(`You're now collaborating on ${notification.sourceLabel}.`);
    } catch (error) {
      console.error('Failed to accept invite:', error);
      toast.error('Could not accept that invite. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(notification: Notification): Promise<void> {
    if (!user) return;
    setBusyId(notification.id);
    try {
      await declineProjectInvite({ projectId: notification.sourceRef, uid: user.uid, notificationId: notification.id });
      setNotifications((previous) => previous?.filter((item) => item.id !== notification.id) ?? null);
    } catch (error) {
      console.error('Failed to decline invite:', error);
      toast.error('Could not decline that invite. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (notifications === null) {
    return <p className="text-sm text-sand">Loading notifications…</p>;
  }

  if (notifications.length === 0) {
    return <p className="text-sm text-oak">Nothing here yet — you&apos;ll see invites and other updates as they come in.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={notification.actorName} size="sm" decorative />
              <div className="flex flex-col">
                {notification.kind === 'mention' ? (
                  <p className="text-sm text-ink">
                    <span className="font-medium">{notification.actorName}</span>{' '}
                    <Link href={`/thread/${notification.sourceRef}`} className="font-medium hover:underline">
                      mentioned you in a reply
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-ink">
                    <span className="font-medium">{notification.actorName}</span> invited you to collaborate on{' '}
                    <Link href={`/projects/${notification.sourceRef}`} className="font-medium hover:underline">
                      {notification.sourceLabel}
                    </Link>
                  </p>
                )}
                <span className="text-xs text-sand">{formatRelativeTime(notification.createdAt)}</span>
              </div>
            </div>
            {notification.kind === 'projectInvite' && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyId === notification.id}
                  onClick={() => void handleDecline(notification)}
                >
                  Decline
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === notification.id}
                  onClick={() => void handleAccept(notification)}
                >
                  Accept
                </Button>
              </div>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
