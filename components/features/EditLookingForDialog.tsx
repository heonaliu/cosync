'use client';

import { IconTrash } from '@tabler/icons-react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { db } from '@/lib/firebase';
import { MAX_LOOKING_FOR_ROLES, type LookingForRole, type Project } from '@/lib/types';

type EditLookingForDialogProps = {
  project: Project;
  trigger: React.ReactNode;
  onSaved: () => void;
};

const EMPTY_ROW: LookingForRole = { role: '', description: '' };

// Owner-only. Up to MAX_LOOKING_FOR_ROLES roles; rows with no role are
// dropped on save, and saving with none left removes the callout entirely
// (deleteField, not an empty array) rather than leaving a blank amber box.
export function EditLookingForDialog({ project, trigger, onSaved }: EditLookingForDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LookingForRole[]>([EMPTY_ROW]);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean): void {
    // Re-seed from the saved value each time, so a cancelled edit doesn't
    // linger into the next open.
    if (nextOpen) setRows(project.lookingFor?.length ? project.lookingFor : [EMPTY_ROW]);
    setOpen(nextOpen);
  }

  function updateRow(index: number, field: keyof LookingForRole, value: string): void {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number): void {
    setRows((previous) => {
      const next = previous.filter((_, i) => i !== index);
      return next.length > 0 ? next : [EMPTY_ROW];
    });
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const cleaned = rows
        .map((row) => ({ role: row.role.trim(), description: row.description.trim() }))
        .filter((row) => row.role)
        .slice(0, MAX_LOOKING_FOR_ROLES);
      await updateDoc(doc(db, 'projects', project.id), {
        lookingFor: cleaned.length > 0 ? cleaned : deleteField(),
      });
      setOpen(false);
      onSaved();
    } catch (error) {
      console.error('Failed to save looking for:', error);
      toast.error('Could not save that. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const hasAnyText = rows.some((row) => row.role || row.description);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Looking for</DialogTitle>
          <DialogDescription>
            Let people know what kind of collaborators would help right now — up to {MAX_LOOKING_FOR_ROLES} roles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-card border border-olive p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink">Role {index + 1}</span>
                {(rows.length > 1 || hasAnyText) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove role ${index + 1}`}
                    onClick={() => removeRow(index)}
                  >
                    <IconTrash className="size-4 text-sand" />
                  </Button>
                )}
              </div>
              <Input
                value={row.role}
                onChange={(event) => updateRow(index, 'role', event.target.value)}
                placeholder="e.g. A CAD collaborator"
                aria-label={`Role ${index + 1}`}
              />
              <Input
                value={row.description}
                onChange={(event) => updateRow(index, 'description', event.target.value)}
                placeholder="Detail, e.g. Fusion 360 preferred"
                aria-label={`Role ${index + 1} detail`}
              />
            </div>
          ))}

          {rows.length < MAX_LOOKING_FOR_ROLES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setRows((previous) => [...previous, EMPTY_ROW])}
            >
              + Add another role
            </Button>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="self-start text-destructive hover:text-destructive"
            onClick={() => setRows([EMPTY_ROW])}
            disabled={!hasAnyText}
          >
            Clear all
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
