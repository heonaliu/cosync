'use client';

import { IconFlag2 } from '@tabler/icons-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type ReportButtonProps = {
  /** Collection/kind name stored on the report doc, e.g. 'club'. */
  kind: string;
  /** Id of the thing being reported — stored as sourceRef. */
  sourceRef: string;
  /** Noun used in the confirm dialog's copy, e.g. "club". */
  label: string;
  className?: string;
};

// CLAUDE.md's safety rules require a report affordance on every
// user-generated surface, writing to reports/{reportId} with severity, kind,
// and sourceRef — this is that button, built generically so other surfaces
// (projects, opportunities, discussions) can reuse it later.
export function ReportButton({ kind, sourceRef, label, className }: ReportButtonProps) {
  const { user } = useAuth();

  async function handleReport(): Promise<void> {
    if (!user) return;
    await addDoc(collection(db, 'reports'), {
      reporterUid: user.uid,
      kind,
      sourceRef,
      severity: 'normal',
      createdAt: serverTimestamp(),
    });
    toast.success("Reported — our team will take a look.");
  }

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="icon-sm" aria-label={`Report this ${label}`} className={className}>
          <IconFlag2 className="size-4 text-sand" />
        </Button>
      }
      title={`Report this ${label}?`}
      description="Let us know if something here needs a closer look from our team."
      confirmLabel="Report"
      onConfirm={handleReport}
    />
  );
}
