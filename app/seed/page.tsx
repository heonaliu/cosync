'use client';

import { addDoc, arrayRemove, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import type {
  ClubAccess,
  ClubColorName,
  ClubIconName,
  ClubScope,
  DiscussionKind,
  OpportunityType,
  ProjectStage,
  ProjectVisibility,
} from '@/lib/types';

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

type DummyJournalEntry = {
  content: string;
  daysAgo: number;
  /** Authored by the first extraMemberUid instead of the seeding account —
   * lets a single-account seed still produce a journal with more than one
   * author, which is what the "hide buttons on the owner's own view
   * regardless of who wrote the entry" behavior needs to actually exercise. */
  byExtraMember?: boolean;
};

type DummyProject = {
  title: string;
  pitch: string;
  description: string;
  tags: string[];
  stage: ProjectStage;
  visibility: ProjectVisibility;
  extraMemberUids: string[];
  lookingFor?: { role: string; description: string };
  links?: { label: string; url: string }[];
  journalEntries: DummyJournalEntry[];
  /** false = reassign ownerUid to a fake uid right after creation, so this
   * project renders as someone else's from the seeding account's point of
   * view — the create rule requires ownerUid == the creator, so there's no
   * way to seed a foreign-owned project directly; this does it in a second
   * write while the seeder is still (briefly) the real owner and allowed to
   * make that change. Same trick DUMMY_CLUBS' isMine uses for memberUids,
   * extended with the ownerUid reassignment projects also need. */
  isMine: boolean;
  /** Only meaningful when isMine is false. true keeps the seeding account in
   * memberUids after the ownerUid reassignment (a "collaborator" test
   * project); false/omitted excludes it entirely (a "viewer" test project). */
  keepSeederAsCollaborator?: boolean;
  /** Only meaningful when isMine is false — the fake uid ownerUid gets
   * reassigned to. */
  fakeOwnerUid?: string;
};

const FAKE_UID = {
  alicia: 'seed-member-alicia',
  jai: 'seed-member-jai',
  maya: 'seed-member-maya',
  sam: 'seed-owner-sam',
  priya: 'seed-owner-priya',
};

const DUMMY_PROJECTS: DummyProject[] = [
  {
    title: 'TrashTracker',
    pitch: 'Pings your phone when the trash bin is full.',
    description:
      'A little device that tells you when the trash goes out — ultrasonic sensor on an ESP32 that pings your phone when the bin hits 80%.',
    tags: ['STEM', 'Hardware'],
    stage: 'prototyping',
    visibility: 'public',
    extraMemberUids: [FAKE_UID.alicia],
    lookingFor: { role: 'A CAD collaborator', description: 'Fusion 360 preferred' },
    links: [
      { label: 'Repository', url: 'https://github.com/example/trashtracker' },
      { label: 'Bill of materials', url: 'https://example.com/trashtracker-bom' },
    ],
    journalEntries: [
      {
        content:
          'Got the sensor calibrated after way too much debugging. Reflection off the trash bag was throwing every reading off — averaging 5 samples per cycle stabilized it. Next: enclosure v2.',
        daysAgo: 2,
      },
      {
        content: "First working prototype! Buzzes when the bin gets over 80%. Enclosure v1 is rough but it works.",
        daysAgo: 5,
        byExtraMember: true,
      },
    ],
    isMine: true,
  },
  {
    title: 'CoSync',
    pitch: 'A home for young makers to collaborate and share.',
    description:
      "A home for K-12 makers to post projects, journal their builds in public, and discover clubs and opportunities in one place.",
    tags: ['AI'],
    stage: 'idea',
    visibility: 'public',
    extraMemberUids: [],
    journalEntries: [
      {
        content: 'First wireframes of the discover page are done — going for warm, cream colors and rounded cards.',
        daysAgo: 1,
      },
    ],
    isMine: true,
  },
  {
    title: 'Nametag PCB',
    pitch: 'Small PCB run with QR and optional NFC.',
    description: 'A small badge PCB run with a QR code and an optional NFC chip, for club meetups and hackathons.',
    tags: ['Software'],
    stage: 'idea',
    visibility: 'draft',
    extraMemberUids: [],
    journalEntries: [],
    isMine: true,
  },
  {
    title: 'Bear-Magotchi',
    pitch: 'Bear-shaped tamagotchi PCB with firmware.',
    description: 'A bear-shaped tamagotchi PCB with custom firmware — feed it, play with it, don’t let it die.',
    tags: ['Hardware'],
    stage: 'shipping',
    visibility: 'public',
    extraMemberUids: [],
    journalEntries: [
      {
        content: 'Enclosure v3 is on the way from JLCPCB — fixed the button alignment issue from v2.',
        daysAgo: 6,
      },
    ],
    isMine: true,
  },
  {
    title: 'RoverBot',
    pitch: 'Tiny robot mapping rooms with SLAM.',
    description:
      'A tiny wheeled robot that maps a room with a mounted ultrasonic sensor. Building the SLAM algorithm from scratch.',
    tags: ['STEM', 'Robotics'],
    stage: 'prototyping',
    visibility: 'public',
    extraMemberUids: [FAKE_UID.jai, FAKE_UID.maya],
    lookingFor: { role: 'Firmware collaborator', description: 'C++ or Rust, embedded experience' },
    links: [
      { label: 'Repository', url: 'https://github.com/example/roverbot' },
      { label: 'Demo video', url: 'https://example.com/roverbot-demo' },
    ],
    journalEntries: [
      {
        content: 'Got the first SLAM pass running. Map is noisy but the shape of the room is recognizable. Working on smoothing the point cloud next.',
        daysAgo: 1,
        byExtraMember: true,
      },
      {
        content: 'Chassis printed and mounted the motors. Wheel alignment is off by ~2 degrees but we’re keeping it — makes it look grumpy.',
        daysAgo: 4,
        byExtraMember: true,
      },
    ],
    // Reassigned to Sam after creation, and the seeding account is NOT added
    // to memberUids — this is the "viewer" test project (Piece 3).
    isMine: false,
    fakeOwnerUid: FAKE_UID.sam,
  },
  {
    title: 'Zine Machine',
    pitch: 'Monthly zine collaborative for teen writers.',
    description: 'A monthly zine collaborative for teen writers and illustrators — new issue drops the first of each month.',
    tags: ['Writing'],
    stage: 'shipping',
    visibility: 'public',
    extraMemberUids: [],
    lookingFor: { role: 'Illustrators', description: 'Looking for a couple of artists to trade pages with writers.' },
    journalEntries: [],
    // Reassigned to Priya after creation, but the seeding account STAYS in
    // memberUids — this is the "collaborator" test project (Piece 2's
    // implicit third render state).
    isMine: false,
    fakeOwnerUid: FAKE_UID.priya,
    keepSeederAsCollaborator: true,
  },
];

type DummyDiscussion = {
  content: string;
  kind: DiscussionKind;
  daysAgo: number;
  replyCount: number;
  cheerCount: number;
  title?: string;
  eventInDays?: number;
  eventLocation?: string;
  eventHost?: string;
  recurringDays?: number[];
  goingCount?: number;
  interestedCount?: number;
};

type DummyClub = {
  name: string;
  description: string;
  iconName: ClubIconName;
  colorName: ClubColorName;
  scope: ClubScope;
  schoolName?: string;
  access: ClubAccess;
  tags: string[];
  hasAdvisor: boolean;
  displayMemberCount: number;
  isMine: boolean;
  meetsSchedule?: string;
  cohortSize?: string;
  cost?: string;
  pinnedResources?: { label: string; url?: string }[];
  whatYoullGet?: string[];
  discussions: DummyDiscussion[];
};

const DUMMY_CLUBS: DummyClub[] = [
  {
    name: 'Hardware at NNHS',
    description: 'Weekly build nights, workshops, and project support for anyone at NNHS who likes to make things.',
    iconName: 'cpu',
    colorName: 'sky',
    scope: 'school',
    schoolName: 'Newton North HS',
    access: 'schoolOnly',
    tags: ['Hardware'],
    hasAdvisor: true,
    displayMemberCount: 28,
    isMine: true,
    pinnedResources: [
      { label: 'Shared parts inventory', url: '#' },
      { label: 'Soldering safety guide' },
      { label: 'Room 217 booking', url: '#' },
    ],
    discussions: [
      {
        content: 'Need to test something quickly for TrashTracker before the weekend. Would return by next Friday.',
        title: 'Anyone have a spare ESP32 board?',
        kind: 'discussion',
        daysAgo: 3,
        replyCount: 4,
        cheerCount: 3,
      },
      {
        content: 'Enough kits for 12 people. Sign up for next Thursday’s session in the RSVP thread below.',
        title: 'Soldering workshop materials have arrived',
        kind: 'announcement',
        daysAgo: 5,
        replyCount: 9,
        cheerCount: 18,
      },
      {
        content: '',
        title: 'Weekly build night',
        kind: 'event',
        daysAgo: 0,
        replyCount: 0,
        cheerCount: 0,
        eventInDays: 3,
        eventLocation: 'Room 217',
        eventHost: 'Ms. Reyes',
        // Thursday + Sunday, as an example of the custom-days picker rather
        // than just "recurs on whatever day eventInDays happens to land on."
        recurringDays: [4, 0],
        goingCount: 8,
        interestedCount: 3,
      },
    ],
  },
  {
    name: 'AI Study Group',
    description: 'Reading through fast.ai together. Kick-off event Thursday online.',
    iconName: 'brain',
    colorName: 'amber',
    scope: 'online',
    access: 'anyone',
    tags: ['AI'],
    hasAdvisor: false,
    displayMemberCount: 14,
    isMine: true,
    discussions: [
      {
        content: 'Starting with lesson 1 this week — anyone want to pair up on the notebook exercises?',
        kind: 'discussion',
        daysAgo: 1,
        replyCount: 2,
        cheerCount: 5,
      },
    ],
  },
  {
    name: 'Robotics beginners',
    description:
      "First-time builders welcome. Kits provided. No robotics experience required — you'll finish your first robot in six weeks.",
    iconName: 'robot',
    colorName: 'sage',
    scope: 'online',
    access: 'anyone',
    tags: ['Robotics'],
    hasAdvisor: true,
    displayMemberCount: 42,
    isMine: false,
    meetsSchedule: 'Sundays 4pm',
    cohortSize: '12 per session',
    cost: 'Free · kits sponsored',
    whatYoullGet: ['Weekly guided builds', 'Starter kit shipped', 'Accountability buddy', 'Certificate on finish'],
    discussions: [
      {
        content: 'Kit ships day 1. First meeting is orientation and unboxing together — bring questions, not tools.',
        title: 'What to expect in the first two weeks',
        kind: 'discussion',
        daysAgo: 2,
        replyCount: 16,
        cheerCount: 28,
      },
      {
        content: 'Took me an extra week to get the PID tuned but it works. Repo linked below.',
        title: 'Finished my line-follower! Sharing the code',
        kind: 'discussion',
        daysAgo: 7,
        replyCount: 9,
        cheerCount: 34,
      },
      {
        content: '4 spots left — join now to reserve one.',
        title: 'Next cohort',
        kind: 'event',
        daysAgo: 0,
        replyCount: 0,
        cheerCount: 0,
        eventInDays: 21,
      },
    ],
  },
  {
    name: 'Generative art',
    description: 'p5.js, TouchDesigner, and shader talks.',
    iconName: 'palette',
    colorName: 'lilac',
    scope: 'online',
    access: 'anyone',
    tags: ['AI'],
    hasAdvisor: false,
    displayMemberCount: 17,
    isMine: false,
    discussions: [],
  },
  {
    name: 'Zine writers',
    description: 'Monthly issue, print or digital.',
    iconName: 'book',
    colorName: 'amber',
    scope: 'online',
    access: 'anyone',
    tags: ['Writing'],
    hasAdvisor: false,
    displayMemberCount: 23,
    isMine: false,
    discussions: [],
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
          // The create rule requires ownerUid == the creator no matter what
          // the project is meant to look like afterward — isMine: false
          // projects get reassigned in a second write below, while the
          // seeding account is still (briefly) the real, permitted owner.
          ownerUid: user.uid,
          title: item.title,
          pitch: item.pitch,
          description: item.description,
          tags: item.tags,
          stage: item.stage,
          visibility: item.visibility,
          memberUids: [user.uid, ...item.extraMemberUids],
          followerCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (item.lookingFor) payload.lookingFor = item.lookingFor;
        if (item.links) payload.links = item.links;

        const projectRef = await addDoc(collection(db, 'projects'), payload);
        setLog((prev) => [...prev, `Created ${item.title} (${projectRef.id})`]);

        for (const entry of item.journalEntries) {
          await addDoc(collection(db, 'projects', projectRef.id, 'journalEntries'), {
            authorUid: entry.byExtraMember ? item.extraMemberUids[0] : user.uid,
            content: entry.content,
            cheerCount: 0,
            commentCount: 0,
            createdAt: new Date(Date.now() - entry.daysAgo * DAY_MS),
          });
        }

        if (!item.isMine && item.fakeOwnerUid) {
          await updateDoc(doc(db, 'projects', projectRef.id), {
            ownerUid: item.fakeOwnerUid,
            memberUids: item.keepSeederAsCollaborator
              ? [item.fakeOwnerUid, user.uid, ...item.extraMemberUids]
              : [item.fakeOwnerUid, ...item.extraMemberUids],
          });
          setLog((prev) => [...prev, `Reassigned ${item.title} to ${item.fakeOwnerUid}`]);
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

  async function handleSeedClubs(): Promise<void> {
    if (!user) return;
    setIsSeeding(true);
    setLog([]);

    for (const item of DUMMY_CLUBS) {
      try {
        const payload: Record<string, unknown> = {
          name: item.name,
          description: item.description,
          iconName: item.iconName,
          colorName: item.colorName,
          scope: item.scope,
          access: item.access,
          tags: item.tags,
          // The create rule requires the creator to be their own admin+member
          // — there's no way to seed a club you're not in directly. For the
          // "discoverable" ones this gets corrected below with an update
          // that removes the seed account from memberUids afterward.
          adminUids: [user.uid],
          memberUids: [user.uid],
          memberCount: item.displayMemberCount,
          createdAt: serverTimestamp(),
        };
        if (item.schoolName) payload.schoolName = item.schoolName;
        if (item.hasAdvisor) payload.advisorUid = user.uid;
        if (item.meetsSchedule) payload.meetsSchedule = item.meetsSchedule;
        if (item.cohortSize) payload.cohortSize = item.cohortSize;
        if (item.cost) payload.cost = item.cost;
        if (item.pinnedResources) payload.pinnedResources = item.pinnedResources;
        if (item.whatYoullGet) payload.whatYoullGet = item.whatYoullGet;

        const clubRef = await addDoc(collection(db, 'clubs'), payload);
        setLog((prev) => [...prev, `Created ${item.name} (${clubRef.id})`]);

        for (const discussion of item.discussions) {
          const discussionPayload: Record<string, unknown> = {
            authorUid: user.uid,
            title: discussion.title ?? '',
            content: discussion.content,
            kind: discussion.kind,
            replyCount: discussion.replyCount,
            cheerCount: discussion.cheerCount,
            createdAt: new Date(Date.now() - discussion.daysAgo * DAY_MS),
          };
          if (discussion.eventInDays !== undefined) {
            discussionPayload.eventDate = new Date(Date.now() + discussion.eventInDays * DAY_MS);
          }
          if (discussion.eventLocation) discussionPayload.eventLocation = discussion.eventLocation;
          if (discussion.eventHost) discussionPayload.eventHost = discussion.eventHost;
          if (discussion.recurringDays) discussionPayload.recurringDays = discussion.recurringDays;
          if (discussion.goingCount !== undefined) discussionPayload.goingCount = discussion.goingCount;
          if (discussion.interestedCount !== undefined) {
            discussionPayload.interestedCount = discussion.interestedCount;
          }
          await addDoc(collection(db, 'clubs', clubRef.id, 'discussions'), discussionPayload);
        }

        if (!item.isMine) {
          await updateDoc(doc(db, 'clubs', clubRef.id), { memberUids: arrayRemove(user.uid) });
        }
      } catch (error) {
        setLog((prev) => [...prev, `Failed ${item.name}: ${String(error)}`]);
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
        <Button onClick={() => void handleSeedClubs()} disabled={!user || isSeeding} className="self-start">
          {isSeeding ? 'Seeding…' : 'Run club seed'}
        </Button>
      </div>
      <pre className="text-xs text-oak">{log.join('\n')}</pre>
    </div>
  );
}
