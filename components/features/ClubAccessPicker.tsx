'use client';

import { IconLock, IconSchool, IconWorld } from '@tabler/icons-react';

import type { ClubAccess } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACCESS_OPTIONS: {
  value: ClubAccess;
  icon: React.ComponentType<{ className?: string }>;
  title: (schoolName: string | null) => string;
  description: (schoolName: string | null) => string;
}[] = [
  {
    value: 'schoolOnly',
    icon: IconSchool,
    title: (schoolName) => (schoolName ? `${schoolName} students only` : 'Students at my school only'),
    description: (schoolName) =>
      `${schoolName ? `${schoolName} students` : 'Students at your school'} can find and join it — anyone else needs your join code`,
  },
  {
    value: 'anyone',
    icon: IconWorld,
    title: () => 'Anyone',
    description: () => 'Any CoSync student can join',
  },
  {
    value: 'invite',
    icon: IconLock,
    title: () => 'By invite only',
    description: () => 'Hidden from Discover — people join with your join code or invite link',
  },
];

type ClubAccessPickerProps = {
  access: ClubAccess;
  /** The school a school-only club is for, used in the option's wording. */
  schoolName: string | null;
  onChange: (access: ClubAccess) => void;
};

// "Who can join" — shared by StartClubDialog and EditClubDialog.
export function ClubAccessPicker({ access, schoolName, onChange }: ClubAccessPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {ACCESS_OPTIONS.map((option) => {
        const isSelected = access === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-3 rounded-card border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
              isSelected ? 'border-2 border-fresh bg-white' : 'border-olive bg-white hover:bg-cream'
            )}
          >
            <Icon className="size-5 shrink-0 text-deep-fresh" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">{option.title(schoolName)}</span>
              <span className="text-xs text-oak">{option.description(schoolName)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
