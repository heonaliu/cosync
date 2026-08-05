'use client';

import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import type { OpportunityType, ProjectStage } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

type DummyOpportunity = {
  type: OpportunityType;
  title: string;
  description: string;
  location?: string;
  deadlineDaysFromNow?: number;
  featured?: boolean;
};

const DUMMY_OPPORTUNITIES: DummyOpportunity[] = [
  {
    type: 'program',
    title: 'Summer Innovation Fellowship',
    description:
      'A 6-week fellowship for student makers to build a project with mentorship and a small stipend.',
    location: 'Remote',
    deadlineDaysFromNow: 30,
    featured: true,
  },
  {
    type: 'hackathon',
    title: 'MIT Hackathon',
    description: '24-hour build weekend for high schoolers. Teams of up to 4.',
    location: 'Cambridge, MA',
    deadlineDaysFromNow: 7,
  },
  {
    type: 'research',
    title: 'Summer NLP research assistant',
    description:
      'Evaluate multilingual sentiment models. 6 hours/week. Open to juniors and seniors with Python experience.',
    location: 'Remote',
    deadlineDaysFromNow: 14,
  },
  {
    type: 'competition',
    title: 'Regional Robotics Challenge',
    description: 'Build and compete with an autonomous robot in a regional qualifier round.',
    location: 'Seattle, WA',
    deadlineDaysFromNow: 45,
  },
  {
    type: 'mentorship',
    title: '1:1 mentorship in embedded systems',
    description: 'Weekly check-ins with a working firmware engineer. Open to any skill level.',
    location: 'Remote',
    // No deadline on purpose — exercises the nulls-last sort on the Opportunities page.
  },
];

type DummyProject = {
  title: string;
  description: string;
  tags: string[];
  stage: ProjectStage;
  extraMemberUids: string[];
  lookingFor?: { role: string; description: string };
  journalEntryCount: number;
};

const DUMMY_PROJECTS: DummyProject[] = [
  {
    title: 'TrashTracker',
    description: 'Pings your phone when the trash bin is full.',
    tags: ['Hardware'],
    stage: 'prototyping',
    extraMemberUids: ['seed-member-1'],
    journalEntryCount: 2,
  },
  {
    title: 'SoundLab',
    description: 'Arduino MIDI synth built from scratch.',
    tags: ['Music'],
    stage: 'shipping',
    extraMemberUids: [],
    journalEntryCount: 1,
  },
  {
    title: 'RoverBot',
    description: 'Tiny robot mapping rooms with an ultrasonic sensor. Building SLAM from scratch.',
    tags: ['Robotics', 'Hardware'],
    stage: 'prototyping',
    extraMemberUids: ['seed-member-1', 'seed-member-2'],
    lookingFor: { role: 'firmware help', description: 'Someone comfortable with embedded C.' },
    journalEntryCount: 3,
  },
  {
    title: 'ArtBot',
    description: 'Generative art from local weather data.',
    tags: ['AI'],
    stage: 'idea',
    extraMemberUids: [],
    journalEntryCount: 0,
  },
  {
    title: 'Zine Machine',
    description: 'Monthly zine collaborative for teen writers.',
    tags: ['Writing'],
    stage: 'shipping',
    extraMemberUids: ['seed-member-1', 'seed-member-2', 'seed-member-3'],
    lookingFor: { role: 'illustrators', description: 'Looking for a couple of artists to trade pages with writers.' },
    journalEntryCount: 0,
  },
  {
    title: 'NestBox',
    description: 'Sensor-equipped bird box logging visits.',
    tags: ['Bio', 'Hardware'],
    stage: 'idea',
    extraMemberUids: ['seed-member-1'],
    journalEntryCount: 0,
  },
];

export default function SeedPage() {
  const { user, status } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  async function handleSeed(): Promise<void> {
    if (!user) return;
    setIsSeeding(true);
    setLog([]);

    for (const item of DUMMY_PROJECTS) {
      try {
        const payload: Record<string, unknown> = {
          ownerUid: user.uid,
          title: item.title,
          pitch: item.description,
          description: item.description,
          tags: item.tags,
          stage: item.stage,
          visibility: 'public',
          memberUids: [user.uid, ...item.extraMemberUids],
          followerCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (item.lookingFor) payload.lookingFor = item.lookingFor;

        const projectRef = await addDoc(collection(db, 'projects'), payload);
        setLog((prev) => [...prev, `Created ${item.title} (${projectRef.id})`]);

        for (let i = 0; i < item.journalEntryCount; i += 1) {
          await addDoc(collection(db, 'projects', projectRef.id, 'journalEntries'), {
            authorUid: user.uid,
            content: `Update #${i + 1} on ${item.title}.`,
            mediaUrls: [],
            cheerCount: 0,
            commentCount: 0,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        setLog((prev) => [...prev, `Failed ${item.title}: ${String(error)}`]);
      }
    }

    setIsSeeding(false);
  }

  async function handleSeedOpportunities(): Promise<void> {
    if (!user) return;
    setIsSeeding(true);
    setLog([]);

    try {
      // The opportunities create rule requires the poster's own user doc to
      // have role 'educator' or 'admin'. There's no onboarding flow yet, so
      // this test account has no user doc at all — create a minimal one
      // (merge: true, so it won't clobber a real profile if one exists).
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: user.displayName ?? 'Demo educator',
          handle: 'demo-educator',
          role: 'educator',
          verified: true,
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setLog((prev) => [...prev, `Set role: educator on users/${user.uid}`]);
    } catch (error) {
      setLog((prev) => [...prev, `Failed to set user role: ${String(error)}`]);
      setIsSeeding(false);
      return;
    }

    for (const item of DUMMY_OPPORTUNITIES) {
      try {
        const payload: Record<string, unknown> = {
          posterUid: user.uid,
          type: item.type,
          title: item.title,
          description: item.description,
          tags: [],
          verified: false,
          featured: Boolean(item.featured),
          createdAt: serverTimestamp(),
        };
        if (item.location) payload.location = item.location;
        if (item.deadlineDaysFromNow !== undefined) {
          payload.deadline = new Date(Date.now() + item.deadlineDaysFromNow * DAY_MS);
        }

        const ref = await addDoc(collection(db, 'opportunities'), payload);
        setLog((prev) => [...prev, `Created ${item.title} (${ref.id})`]);
      } catch (error) {
        setLog((prev) => [...prev, `Failed ${item.title}: ${String(error)}`]);
      }
    }

    setIsSeeding(false);
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-lg font-medium text-ink">Seed dummy data</h1>
      {status !== 'authed' && <p className="text-sm text-oak">Sign in first, then reload this page.</p>}
      <div className="flex gap-3">
        <Button onClick={() => void handleSeed()} disabled={!user || isSeeding} className="self-start">
          {isSeeding ? 'Seeding…' : 'Run project seed'}
        </Button>
        <Button
          onClick={() => void handleSeedOpportunities()}
          disabled={!user || isSeeding}
          className="self-start"
        >
          {isSeeding ? 'Seeding…' : 'Run opportunity seed'}
        </Button>
      </div>
      <pre className="text-xs text-oak">{log.join('\n')}</pre>
    </div>
  );
}
