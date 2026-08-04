'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import type { ProjectStage } from '@/lib/types';

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

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-lg font-medium text-ink">Seed dummy projects</h1>
      {status !== 'authed' && <p className="text-sm text-oak">Sign in first, then reload this page.</p>}
      <Button onClick={() => void handleSeed()} disabled={!user || isSeeding} className="self-start">
        {isSeeding ? 'Seeding…' : 'Run seed'}
      </Button>
      <pre className="text-xs text-oak">{log.join('\n')}</pre>
    </div>
  );
}
