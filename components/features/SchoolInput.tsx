'use client';

import { useEffect, useId, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { getKnownSchools } from '@/lib/queries';
import { cn } from '@/lib/utils';

const MAX_SUGGESTIONS = 6;

type SchoolInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// Free text, with suggestions from schools already on CoSync (see
// getKnownSchools) so people pick the existing spelling instead of
// inventing a new one. Arrow keys move through suggestions, Enter picks,
// Escape closes — a minimal ARIA combobox.
export function SchoolInput({ id, value, onChange, placeholder = 'Start typing your school' }: SchoolInputProps) {
  const listId = useId();
  const [schools, setSchools] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    getKnownSchools()
      .then((names) => {
        if (!cancelled) setSchools(names);
      })
      .catch((error: unknown) => console.error('Failed to load school suggestions:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const query = value.trim().toLowerCase();
  const suggestions = query
    ? schools
        .filter((name) => name.toLowerCase().includes(query) && name.toLowerCase() !== query)
        // Names that start with what's typed rank above mid-word matches.
        .sort((a, b) => Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query)))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const showList = isOpen && suggestions.length > 0;

  function pick(name: string): void {
    onChange(name);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (!showList) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation(); // close the list, not the whole dialog
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-card border border-olive bg-white py-1"
        >
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(name);
              }}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm text-ink',
                index === activeIndex ? 'bg-cream' : 'hover:bg-cream'
              )}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
