'use client';

import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { CLUB_SCOPE_OPTIONS, MAX_CUSTOM_SCOPE_LENGTH } from '@/lib/clubScopes';
import type { ClubScope } from '@/lib/types';

type ClubScopePickerProps = {
  scope: ClubScope;
  customScope: string;
  onScopeChange: (scope: ClubScope) => void;
  onCustomScopeChange: (customScope: string) => void;
};

// "Where does it meet" — shared by StartClubDialog and EditClubDialog.
export function ClubScopePicker({ scope, customScope, onScopeChange, onCustomScopeChange }: ClubScopePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {CLUB_SCOPE_OPTIONS.map((option) => (
          <PillToggle
            key={option.value}
            label={option.label}
            isActive={scope === option.value}
            activeColor="purple"
            onClick={() => onScopeChange(option.value)}
          />
        ))}
      </div>
      {scope === 'other' && (
        <Input
          autoFocus
          value={customScope}
          onChange={(event) => onCustomScopeChange(event.target.value)}
          maxLength={MAX_CUSTOM_SCOPE_LENGTH}
          placeholder="e.g. Library, Tuesdays"
          aria-label="Where the club meets"
        />
      )}
    </div>
  );
}
