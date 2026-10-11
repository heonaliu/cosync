'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';

const TAG_OPTIONS = ['Hardware', 'Robotics', 'AI', 'Writing', 'Music'];

type ClubTagPickerProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

// Preset tags plus written-in ones — shared by StartClubDialog and
// EditClubDialog so a club's tags are picked the same way both times.
export function ClubTagPicker({ tags, onChange }: ClubTagPickerProps) {
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);

  function toggleTag(tag: string): void {
    onChange(tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]);
  }

  function addCustomTag(): void {
    const tag = customTagInput.trim();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setCustomTagInput('');
    setShowCustomTagInput(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TAG_OPTIONS.map((tag) => (
        <PillToggle
          key={tag}
          label={tag}
          isActive={tags.includes(tag)}
          activeColor="purple"
          onClick={() => toggleTag(tag)}
        />
      ))}
      {tags
        .filter((tag) => !TAG_OPTIONS.includes(tag))
        .map((tag) => (
          <PillToggle key={tag} label={tag} isActive activeColor="purple" onClick={() => toggleTag(tag)} />
        ))}
      {showCustomTagInput ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={customTagInput}
            onChange={(event) => setCustomTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomTag();
              }
            }}
            onBlur={addCustomTag}
            placeholder="Tag name"
            className="h-8 w-32"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomTagInput(true)}
          className="rounded-pill border border-dashed border-olive px-4 py-2 text-sm text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          + Custom
        </button>
      )}
    </div>
  );
}
