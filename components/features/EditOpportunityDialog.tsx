'use client';

import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { AddressAutocompleteInput } from '@/components/features/AddressAutocompleteInput';
import { GradeRangeField } from '@/components/features/GradeRangeField';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/color';
import { parseCountries } from '@/lib/countries';
import { db } from '@/lib/firebase';
import { CUSTOM_TYPE_MAX_LENGTH, OPPORTUNITY_TYPE_OPTIONS } from '@/lib/opportunityTypes';
import { formatDateInputValue, parseDateInputValue } from '@/lib/time';
import type { Opportunity, OpportunityStatus, OpportunityType } from '@/lib/types';

const STATUS_OPTIONS: OpportunityStatus[] = ['rolling', 'ongoing', 'soon', 'passed'];

// Same presets as AddOpportunityDialog's AGE_RANGE_PRESETS — kept as a
// separate copy here rather than a shared import, matching how
// STATUS_OPTIONS is already duplicated between these two files.
const AGE_RANGE_PRESETS: { value: '13-18' | '18+'; label: string }[] = [
  { value: '13-18', label: '13–18' },
  { value: '18+', label: '18+' },
];

// A stored ageRange round-trips onto a preset pill only if it matches one
// exactly; anything else (including one of these same presets typed by hand
// before this UI existed) opens as "Custom" with the raw text preserved.
function ageRangePresetFor(ageRange: string | undefined): '13-18' | '18+' | 'custom' | null {
  if (!ageRange) return null;
  if (ageRange === '13-18' || ageRange === '18+') return ageRange;
  return 'custom';
}

type EditOpportunityDialogProps = {
  opportunity: Opportunity;
  trigger: React.ReactNode;
  onSaved: (updated: Opportunity) => void;
};

// Owner-only (enforced by firestore.rules — the opportunities update rule
// already lets the poster edit any field, unlike some other update rules in
// this app that restrict which fields a write can touch, so no rules change
// was needed for this). Lets the person who posted an opportunity change its
// specifications after the fact, including a status that wasn't answerable
// at creation time (e.g. moving from "opening soon" to "ongoing" once it
// actually opens).
export function EditOpportunityDialog({ opportunity, trigger, onSaved }: EditOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(opportunity.title);
  const [type, setType] = useState<OpportunityType>(opportunity.type);
  const [customType, setCustomType] = useState(opportunity.customType ?? '');
  const [description, setDescription] = useState(opportunity.description);
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status ?? 'rolling');
  const [openDate, setOpenDate] = useState(opportunity.openDate ? formatDateInputValue(new Date(opportunity.openDate)) : '');
  const [deadline, setDeadline] = useState(opportunity.deadline ? formatDateInputValue(new Date(opportunity.deadline)) : '');
  const [location, setLocation] = useState(opportunity.location ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    opportunity.lat !== undefined && opportunity.lng !== undefined
      ? { lat: opportunity.lat, lng: opportunity.lng }
      : null
  );
  const [applicationUrl, setApplicationUrl] = useState(opportunity.applicationUrl ?? '');
  const [ageRangePreset, setAgeRangePreset] = useState<'13-18' | '18+' | 'custom' | null>(
    ageRangePresetFor(opportunity.ageRange)
  );
  const [gradeRange, setGradeRange] = useState<{ min: number | null; max: number | null }>({
    min: opportunity.gradeMin ?? null,
    max: opportunity.gradeMax ?? null,
  });
  const [countries, setCountries] = useState((opportunity.countries ?? []).join(', '));
  const [ageRangeCustom, setAgeRangeCustom] = useState(
    ageRangePresetFor(opportunity.ageRange) === 'custom' ? (opportunity.ageRange ?? '') : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && description.trim().length > 0 && (status !== 'soon' || openDate);

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    if (type === 'other' && !customType.trim()) {
      setError('Write in what type of opportunity this is.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const ageRange = ageRangePreset === 'custom' ? ageRangeCustom.trim() : (ageRangePreset ?? '');
      const countryList = parseCountries(countries);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        type,
        customType: type === 'other' ? customType.trim() : deleteField(),
        description: description.trim(),
        status,
        deadline: deadline ? parseDateInputValue(deadline) : deleteField(),
        location: location.trim() ? location.trim() : deleteField(),
        applicationUrl: applicationUrl.trim() ? applicationUrl.trim() : deleteField(),
        // status !== 'soon' clears openDate outright rather than leaving a
        // stale date behind once it no longer means anything.
        openDate: status === 'soon' && openDate ? parseDateInputValue(openDate) : deleteField(),
        ageRange: ageRange ? ageRange : deleteField(),
        gradeMin: gradeRange.min ?? deleteField(),
        gradeMax: gradeRange.max ?? deleteField(),
        countries: countryList.length > 0 ? countryList : deleteField(),
      };
      // Always set both together, never leave one stale: if the location
      // text was free-typed rather than picked from the dropdown (coords is
      // null even though location isn't empty), there's no verified point
      // for it — clearing lat/lng here is what stops the OLD address's
      // coordinates from silently surviving under new location text.
      if (location.trim() && coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else {
        payload.lat = deleteField();
        payload.lng = deleteField();
      }

      await updateDoc(doc(db, 'opportunities', opportunity.id), payload);

      onSaved({
        ...opportunity,
        title: title.trim(),
        type,
        customType: type === 'other' ? customType.trim() : undefined,
        description: description.trim(),
        status,
        deadline: deadline ? parseDateInputValue(deadline).getTime() : undefined,
        location: location.trim() || undefined,
        lat: location.trim() ? coords?.lat : undefined,
        lng: location.trim() ? coords?.lng : undefined,
        applicationUrl: applicationUrl.trim() || undefined,
        openDate: status === 'soon' && openDate ? parseDateInputValue(openDate).getTime() : undefined,
        ageRange: ageRange || undefined,
        gradeMin: gradeRange.min ?? undefined,
        gradeMax: gradeRange.max ?? undefined,
        countries: countryList.length > 0 ? countryList : undefined,
      });
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
      // Same fix as AddOpportunityDialog — see there for why modal={false}
      // plus the onInteractOutside guard below are both needed together.
      modal={false}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-md"
        onInteractOutside={(event) => {
          if ((event.target as HTMLElement).closest('.pac-container')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit opportunity</DialogTitle>
          <DialogDescription>Update the specifications anyone sees on this listing.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-title" className="text-sm text-ink">
              Title
            </label>
            <Input id="edit-opportunity-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-type" className="text-sm text-ink">
              Type
            </label>
            <Select value={type} onValueChange={(value) => setType(value as OpportunityType)}>
              <SelectTrigger id="edit-opportunity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPPORTUNITY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type === 'other' && (
              <Input
                value={customType}
                onChange={(event) => setCustomType(event.target.value)}
                maxLength={CUSTOM_TYPE_MAX_LENGTH}
                placeholder="e.g. Summer camp, Scholarship, Internship"
                aria-label="Your opportunity type"
                required
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-description" className="text-sm text-ink">
              Description
            </label>
            <Textarea
              id="edit-opportunity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <PillToggle
                  key={option}
                  label={OPPORTUNITY_STATUS_LABELS[option]}
                  isActive={status === option}
                  activeColor="purple"
                  onClick={() => setStatus(option)}
                />
              ))}
            </div>
          </div>

          {status === 'soon' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-opportunity-open-date" className="text-sm text-ink">
                Open date
              </label>
              <DatePicker id="edit-opportunity-open-date" value={openDate} onChange={setOpenDate} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-deadline" className="text-sm text-ink">
              Deadline <span className="text-sand">(optional — leave blank if rolling)</span>
            </label>
            <DatePicker id="edit-opportunity-deadline" value={deadline} onChange={setDeadline} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">
              Age range <span className="text-sand">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGE_PRESETS.map((option) => (
                <PillToggle
                  key={option.value}
                  label={option.label}
                  isActive={ageRangePreset === option.value}
                  activeColor="purple"
                  onClick={() => setAgeRangePreset(option.value)}
                />
              ))}
              <PillToggle
                label="Custom"
                isActive={ageRangePreset === 'custom'}
                activeColor="purple"
                onClick={() => setAgeRangePreset('custom')}
              />
            </div>
            {ageRangePreset === 'custom' && (
              <Input
                aria-label="Custom age range"
                placeholder="e.g. 16+"
                value={ageRangeCustom}
                onChange={(event) => setAgeRangeCustom(event.target.value)}
                className="mt-1"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-grade-min" className="text-sm text-ink">
              Grade range <span className="text-sand">(optional)</span>
            </label>
            <GradeRangeField idPrefix="edit-opportunity-grade" min={gradeRange.min} max={gradeRange.max} onChange={setGradeRange} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-countries" className="text-sm text-ink">
              Countries <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="edit-opportunity-countries"
              value={countries}
              onChange={(event) => setCountries(event.target.value)}
              placeholder="e.g. USA, Canada"
            />
            <span className="text-xs text-sand">Only if it&apos;s limited to certain countries. Separate them with commas.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-location" className="text-sm text-ink">
              Location <span className="text-sand">(optional)</span>
            </label>
            <AddressAutocompleteInput
              id="edit-opportunity-location"
              placeholder="Online, or start typing an address"
              defaultValue={location}
              onChange={(value) => {
                setLocation(value);
                setCoords(null);
              }}
              onAddressSelected={({ address, lat, lng }) => {
                setLocation(address);
                setCoords({ lat, lng });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-url" className="text-sm text-ink">
              Application URL <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="edit-opportunity-url"
              type="url"
              placeholder="https://…"
              value={applicationUrl}
              onChange={(event) => setApplicationUrl(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || !canSave} onClick={() => void handleSave()}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
