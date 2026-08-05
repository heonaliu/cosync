import { IconBook2, IconBrain, IconCpu, IconMusic, IconPalette, IconRobot } from '@tabler/icons-react';

import type { ClubColorName, ClubIconName } from '@/lib/types';

export const CLUB_ICON_OPTIONS: { name: ClubIconName; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'cpu', icon: IconCpu },
  { name: 'robot', icon: IconRobot },
  { name: 'brain', icon: IconBrain },
  { name: 'palette', icon: IconPalette },
  { name: 'book', icon: IconBook2 },
  { name: 'music', icon: IconMusic },
];

const CLUB_ICON_MAP: Record<ClubIconName, React.ComponentType<{ className?: string }>> = {
  cpu: IconCpu,
  robot: IconRobot,
  brain: IconBrain,
  palette: IconPalette,
  book: IconBook2,
  music: IconMusic,
};

export function clubIconFor(name: ClubIconName): React.ComponentType<{ className?: string }> {
  return CLUB_ICON_MAP[name];
}

export const CLUB_COLOR_OPTIONS: ClubColorName[] = ['sky', 'amber', 'sage', 'lilac', 'peach'];
