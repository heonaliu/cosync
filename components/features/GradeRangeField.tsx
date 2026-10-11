'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { GRADE_OPTIONS } from '@/lib/gradeRange';

// Select can't hold an empty-string value, so "Any" is its own sentinel.
const ANY = 'any';

type GradeRangeFieldProps = {
  idPrefix: string;
  min: number | null;
  max: number | null;
  onChange: (range: { min: number | null; max: number | null }) => void;
};

// Two dropdowns, either can stay "Any". Picking a "from" above the current
// "to" (or the reverse) moves the other end along so the range never ends
// up backwards.
export function GradeRangeField({ idPrefix, min, max, onChange }: GradeRangeFieldProps) {
  function parse(value: string): number | null {
    return value === ANY ? null : Number(value);
  }

  function handleMin(value: string): void {
    const nextMin = parse(value);
    onChange({ min: nextMin, max: nextMin !== null && max !== null && max < nextMin ? nextMin : max });
  }

  function handleMax(value: string): void {
    const nextMax = parse(value);
    onChange({ min: nextMax !== null && min !== null && min > nextMax ? nextMax : min, max: nextMax });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={min === null ? ANY : String(min)} onValueChange={handleMin}>
        <SelectTrigger id={`${idPrefix}-min`} aria-label="Lowest grade" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {GRADE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-sand">to</span>
      <Select value={max === null ? ANY : String(max)} onValueChange={handleMax}>
        <SelectTrigger id={`${idPrefix}-max`} aria-label="Highest grade" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {GRADE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
