'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { acceptProjectInvite, declineProjectInvite, getNotifications, markNotificationsSeen } from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/time';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

export function NotificationsView() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Which ones were new when this page opened. They're marked seen in
  // Firestore straight away (clearing the avatar badge), but keep their
  // green dot for this visit so you can still tell what's new.
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getNotifications(user.uid)
      .then((result) => {
        if (cancelled) return;
        const unseen = result.filter((notification) => !notification.seen).map((notification) => notification.id);
        setNotifications(result);
        setUnreadIds(new Set(unseen));
        // Once someone's actually looking at this list, every unseen item
        // in it counts as read.
        markNotificationsSeen(user.uid, unseen).catch((error: unknown) =>
          console.error('Failed to mark notifications seen:', error)
        );
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
    return <p className="text-sm text-oak">Nothing here yet — you&apos;ll see invites, replies, and new followers as they come in.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* Fixed-width slot so read and unread rows line up. */}
              <span className="flex w-2 shrink-0 justify-center">
                {unreadIds.has(notification.id) && (
                  <>
                    <span aria-hidden="true" className="size-2 rounded-full bg-fresh" />
                    <span className="sr-only">Unread</span>
                  </>
                )}
              </span>
              <Avatar name={notification.actorName} size="sm" decorative />
              <div className="flex min-w-0 flex-col">
                {notification.kind === 'mention' && (
                  <p className="text-sm text-ink">
                    <span className="font-medium">{notification.actorName}</span>{' '}
                    <Link href={`/thread/${notification.sourceRef}`} className="font-medium hover:underline">
                      mentioned you in a reply
                    </Link>
                  </p>
                )}
                {notification.kind === 'reply' && (
                  <p className="text-sm text-ink">
                    <span className="font-medium">{notification.actorName}</span>{' '}
                    <Link href={`/thread/${notification.sourceRef}`} className="font-medium hover:underline">
                      replied to you
                    </Link>
                  </p>
                )}
                {notification.kind === 'follow' && (
                  <p className="text-sm text-ink">
                    <Link href={`/profile/${notification.actorUid}`} className="font-medium hover:underline">
                      {notification.actorName}
                    </Link>{' '}
                    started following you
                  </p>
                )}
                {(notification.kind === 'reply' || notification.kind === 'mention') && notification.preview && (
                  <p className="mt-1 line-clamp-2 border-l-2 border-olive pl-2 text-sm text-oak">
                    {notification.preview}
                  </p>
                )}
                {notification.kind === 'projectInvite' && (
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
