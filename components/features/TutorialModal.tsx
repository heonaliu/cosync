'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Step = { label: string; description: string };

const STEPS: Step[] = [
  {
    label: 'Home',
    description:
      'Your feed — recent build-journal updates and club activity from the people, projects, and clubs you follow.',
  },
  {
    label: 'Discover',
    description: 'Browse every public project on CoSync — search by tag, stage, or what someone needs help with.',
  },
  {
    label: 'Projects',
    description:
      "Your own projects: what you own, what you're contributing to, and anything you're keeping private for now.",
  },
  {
    label: 'Opportunities',
    description: 'Research programs, hackathons, and competitions posted by verified educators and researchers.',
  },
  {
    label: 'Clubs',
    description: 'Join a school or online club, post discussions, and RSVP to events with other members.',
  },
];

type TutorialModalProps = {
  open: boolean;
  onClose: () => void;
};

// A short step-through overlay explaining the five main nav tabs, one at a
// time — opened automatically once for new users (see TutorialButton) and
// reopenable anytime from the corner button.
export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  function finish(): void {
    setStepIndex(0);
    onClose();
  }

  function handleNext(): void {
    if (isLastStep) {
      finish();
    } else {
      setStepIndex((index) => index + 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && finish()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step.label}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, index) => (
            <span
              key={s.label}
              className={cn('size-1.5 rounded-full', index === stepIndex ? 'bg-fresh' : 'bg-olive')}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={finish}>
            Skip
          </Button>
          <Button type="button" onClick={handleNext}>
            {isLastStep ? 'Done' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
