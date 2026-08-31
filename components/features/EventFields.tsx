import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { WEEKDAY_LABELS } from '@/lib/time';
import { cn } from '@/lib/utils';

export type EventFormValues = {
  eventDay: string;
  eventTime: string;
  eventLocation: string;
  eventHost: string;
  recurringDays: number[];
};

type EventFieldsProps = {
  value: EventFormValues;
  onChange: (value: EventFormValues) => void;
};

// Shared by ClubComposer (create) and EditEventDialog (edit) — same fields,
// same "select the weekdays it repeats on" picker, so the two forms can't
// drift apart. No days selected = a one-time event, matching how
// recurringDays is stored (empty/undefined) and read (getNextEventOccurrence).
export function EventFields({ value, onChange }: EventFieldsProps) {
  function update<K extends keyof EventFormValues>(key: K, next: EventFormValues[K]): void {
    onChange({ ...value, [key]: next });
  }

  function toggleDay(day: number): void {
    const next = value.recurringDays.includes(day)
      ? value.recurringDays.filter((existing) => existing !== day)
      : [...value.recurringDays, day].sort((a, b) => a - b);
    update('recurringDays', next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-white p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="event-day" className="text-xs text-oak">
            Day
          </label>
          <DatePicker id="event-day" value={value.eventDay} onChange={(next) => update('eventDay', next)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="event-time" className="text-xs text-oak">
            Time
          </label>
          <Input
            id="event-time"
            type="time"
            value={value.eventTime}
            onChange={(event) => update('eventTime', event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="event-room" className="text-xs text-oak">
            Room
          </label>
          <Input
            id="event-room"
            placeholder="e.g. Room 217"
            value={value.eventLocation}
            onChange={(event) => update('eventLocation', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="event-host" className="text-xs text-oak">
            Hosted by
          </label>
          <Input
            id="event-host"
            placeholder="e.g. Ms. Reyes"
            value={value.eventHost}
            onChange={(event) => update('eventHost', event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-oak">Repeats on</span>
        <div className="flex gap-1.5" role="group" aria-label="Repeats on">
          {WEEKDAY_LABELS.map((label, index) => {
            const isSelected = value.recurringDays.includes(index);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={isSelected}
                aria-label={label}
                onClick={() => toggleDay(index)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                  isSelected ? 'border-fresh bg-fresh text-white' : 'border-olive bg-white text-oak hover:bg-cream'
                )}
              >
                {label[0]}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-sand">
          {value.recurringDays.length === 0
            ? 'One-time event — select days above to repeat weekly instead.'
            : 'Repeats weekly on the selected days.'}
        </span>
      </div>
    </div>
  );
}
