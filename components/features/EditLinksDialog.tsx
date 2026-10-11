'use client';

import { IconTrash } from '@tabler/icons-react';
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

export type LinkRow = { label: string; url: string };

type EditLinksDialogProps = {
  title: string;
  description: string;
  initialLinks: { label: string; url?: string }[];
  /** Receives only the rows worth keeping (see below), trimmed. */
  onSave: (links: { label: string; url?: string }[]) => Promise<void>;
  trigger: React.ReactNode;
  /** Club pinned resources can be a plain label ("Bring a laptop") with no
   * link; project links can't. */
  urlOptional?: boolean;
};

// Used for a project's Links (owner) and a club's Pinned resources (admins).
// Rows missing a label — or a URL, unless urlOptional — are dropped on save,
// so someone can leave a half-filled row while typing without it becoming a
// broken link on the page.
export function EditLinksDialog({ title, description, initialLinks, onSave, trigger, urlOptional = false }: EditLinksDialogProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean): void {
    // Re-seed from the saved value each time the dialog opens, so a
    // cancelled edit doesn't linger and a save made elsewhere shows up.
    if (nextOpen) setLinks(initialLinks.map((link) => ({ label: link.label, url: link.url ?? '' })));
    setOpen(nextOpen);
  }

  function updateRow(index: number, field: keyof LinkRow, value: string): void {
    setLinks((previous) => previous.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number): void {
    setLinks((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const cleaned = links
        .map((row) => ({ label: row.label.trim(), url: row.url.trim() }))
        .filter((row) => row.label && (urlOptional || row.url))
        .map((row) => (row.url ? row : { label: row.label }));
      await onSave(cleaned);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save links:', error);
      toast.error('Could not save those links. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {links.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={row.label}
                onChange={(event) => updateRow(index, 'label', event.target.value)}
                placeholder="Label"
                className="w-32"
                aria-label="Link label"
              />
              <Input
                value={row.url}
                onChange={(event) => updateRow(index, 'url', event.target.value)}
                placeholder={urlOptional ? 'https://… (optional)' : 'https://…'}
                aria-label="Link URL"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove link"
                onClick={() => removeRow(index)}
              >
                <IconTrash className="size-4 text-sand" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLinks((previous) => [...previous, { label: '', url: '' }])}>
            + Add link
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
