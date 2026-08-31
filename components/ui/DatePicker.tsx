'use client';

import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { useState } from 'react';

import { formatDateInputValue, parseDateInputValue, WEEKDAY_LABELS } from '@/lib/time';
import { cn } from '@/lib/utils';

// Native <input type="date">'s calendar popup is OS/browser chrome — no
// amount of CSS reaches it in any browser, so it always looked jarring next
// to the rest of the cream/rounded design. This renders the whole thing
// (trigger + popup + grid) as ordinary DOM, styled like everything else.

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Always 6 full weeks (42 days) so the grid's height never shifts between
// months — leading/trailing days from adjacent months fill the rest, shown
// muted rather than omitted.
function getCalendarDays(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

export function DatePicker({ id, value, onChange, placeholder = 'Select a date', disabled, ...ariaProps }: DatePickerProps) {
  const selected = value ? parseDateInputValue(value) : null;
  const [open, setOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => selected ?? new Date());

  // Re-seeds the visible month from the current value every time the
  // popover opens (not just once at mount) — the same async-prop-race fix
  // used throughout this codebase (see LocationField), since a value that
  // arrives after mount would otherwise leave the calendar stuck on today's
  // month even when editing something with a real saved date.
  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) setMonthAnchor(selected ?? new Date());
  }

  const today = new Date();
  const days = getCalendarDays(monthAnchor);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaProps['aria-label']}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-pill border border-olive bg-white px-4 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-fresh disabled:pointer-events-none disabled:opacity-50',
            selected ? 'text-ink' : 'text-sand'
          )}
        >
          <IconCalendar className="size-4 shrink-0 text-sand" aria-hidden="true" />
          {selected
            ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : placeholder}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-50 w-72 rounded-card border border-olive bg-white p-3 text-ink shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="flex size-7 items-center justify-center rounded-pill text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-ink">
              {MONTH_LABELS[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="flex size-7 items-center justify-center rounded-pill text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="flex h-7 items-center justify-center text-xs text-sand">
                {label[0]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const isSelected = selected !== null && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(formatDateInputValue(day));
                    setOpen(false);
                  }}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-pill text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                    !inMonth && 'text-sand/60',
                    inMonth && !isSelected && 'text-ink hover:bg-cream',
                    isSelected && 'bg-fresh text-white hover:bg-deep-fresh',
                    !isSelected && isToday && 'font-medium text-deep-fresh'
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="mt-2 w-full rounded-pill py-1.5 text-center text-xs text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              Clear date
            </button>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
