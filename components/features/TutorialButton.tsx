'use client';

import { IconHelpCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { TutorialModal } from '@/components/features/TutorialModal';
import { useTutorial } from '@/lib/useTutorial';

// Fixed-position corner button, same pattern most apps use for a help/tour
// affordance — present on every authed page (see app/layout.tsx), always
// reopenable, but only force-opens the tour once for someone who hasn't
// seen it yet (hasSeenTutorial on their users/{uid} doc).
export function TutorialButton() {
  const { status, hasSeenTutorial, markSeen } = useTutorial();
  const [open, setOpen] = useState(false);
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (status === 'authed' && hasSeenTutorial === false && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setOpen(true);
    }
  }, [status, hasSeenTutorial]);

  if (status !== 'authed') return null;

  function handleClose(): void {
    setOpen(false);
    if (hasSeenTutorial === false) void markSeen();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open guided tour"
        className="fixed bottom-5 right-5 z-40 flex size-11 items-center justify-center rounded-full bg-fresh text-white shadow-md transition-colors hover:bg-deep-fresh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh focus-visible:ring-offset-2"
      >
        <IconHelpCircle className="size-5" aria-hidden="true" />
      </button>
      <TutorialModal open={open} onClose={handleClose} />
    </>
  );
}
