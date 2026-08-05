'use client';

import { IconTrash } from '@tabler/icons-react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

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
import type { Project } from '@/lib/types';

type EditLinksDialogProps = {
  project: Project;
  trigger: React.ReactNode;
  onSaved: () => void;
};

type LinkRow = { label: string; url: string };

// Owner-only. Rows with an empty label or url are dropped on save, so
// someone can leave a half-filled row while typing without it becoming a
// broken link on the page.
export function EditLinksDialog({ project, trigger, onSaved }: EditLinksDialogProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>(project.links ?? []);
  const [isSaving, setIsSaving] = useState(false);

  function updateRow(index: number, field: keyof LinkRow, value: string): void {
    setLinks((previous) => previous.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number): void {
    setLinks((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const cleaned = links.filter((row) => row.label.trim() && row.url.trim());
      await updateDoc(doc(db, 'projects', project.id), {
        links: cleaned.length > 0 ? cleaned : deleteField(),
      });
      setOpen(false);
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Links</DialogTitle>
          <DialogDescription>Repo, demo video, bill of materials — whatever&apos;s worth linking to.</DialogDescription>
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
                placeholder="https://…"
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
