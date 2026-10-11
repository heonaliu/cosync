'use client';

import { IconArrowsMove, IconPhoto } from '@tabler/icons-react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { ProjectCover } from '@/components/features/ProjectCover';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { MAX_IMAGE_BYTES, uploadImage } from '@/lib/imageUpload';
import type { CoverPosition, Project } from '@/lib/types';
import { cn } from '@/lib/utils';

type ProjectCoverEditorProps = {
  project: Project;
  onChanged: () => void;
};

const CENTER: CoverPosition = { x: 50, y: 50 };
const KEY_STEP = 5;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// Owner-only, on the project page itself: add, change, remove, or
// reposition the cover without opening Edit project (which can add/remove
// it too). Saves straight to the project doc — the owner has full write in
// firestore.rules.
//
// Repositioning drags the photo inside the banner and stores the result as
// object-position percentages (coverPosition), which cards use as well — so
// the part you pick here stays in view on the 2:1 card crop too.
export function ProjectCoverEditor({ project, onChanged }: ProjectCoverEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; start: CoverPosition } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [draft, setDraft] = useState<CoverPosition | null>(null); // non-null = repositioning
  const isRepositioning = draft !== null;
  const shownPosition = draft ?? project.coverPosition ?? CENTER;

  // A new or removed photo starts centered — the old focal point was
  // picked for a different image.
  async function save(coverImageUrl: string | null): Promise<void> {
    await updateDoc(doc(db, 'projects', project.id), {
      coverImageUrl: coverImageUrl ?? deleteField(),
      coverPosition: deleteField(),
    });
    onChanged();
  }

  // How far (px) the cropped image overflows the frame on each axis. With
  // object-cover only one axis normally overflows, so the photo only moves
  // in the direction there's actually more of it to show.
  function getOverflow(): { x: number; y: number } {
    const frame = frameRef.current;
    const image = frame?.querySelector('img');
    if (!frame || !image?.naturalWidth) return { x: 0, y: 0 };
    const { width, height } = frame.getBoundingClientRect();
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    return { x: image.naturalWidth * scale - width, y: image.naturalHeight * scale - height };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (!draft) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, start: draft };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    const overflow = getOverflow();
    // Dragging the photo right reveals more of its left side, so the
    // position percentage moves the opposite way to the pointer.
    setDraft({
      x: overflow.x > 1 ? clamp(drag.start.x - ((event.clientX - drag.pointerX) / overflow.x) * 100) : drag.start.x,
      y: overflow.y > 1 ? clamp(drag.start.y - ((event.clientY - drag.pointerY) / overflow.y) * 100) : drag.start.y,
    });
  }

  function handlePointerUp(): void {
    dragRef.current = null;
  }

  // Keyboard alternative to dragging — arrow keys move the photo the same
  // way the pointer does.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!draft) return;
    const moves: Record<string, CoverPosition> = {
      ArrowLeft: { x: draft.x + KEY_STEP, y: draft.y },
      ArrowRight: { x: draft.x - KEY_STEP, y: draft.y },
      ArrowUp: { x: draft.x, y: draft.y + KEY_STEP },
      ArrowDown: { x: draft.x, y: draft.y - KEY_STEP },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    setDraft({ x: clamp(next.x), y: clamp(next.y) });
  }

  async function handleSavePosition(): Promise<void> {
    if (!draft) return;
    setIsBusy(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        coverPosition: { x: Math.round(draft.x * 10) / 10, y: Math.round(draft.y * 10) / 10 },
      });
      setDraft(null);
      onChanged();
    } catch (error) {
      console.error('Failed to save cover position:', error);
      toast.error('Could not save the new position. Try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('That file isn’t an image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('That image is over 10 MB. Try a smaller one.');
      return;
    }
    setIsBusy(true);
    try {
      await save(await uploadImage(file));
      toast.success('Cover photo updated.');
    } catch (error) {
      console.error('Failed to update cover:', error);
      toast.error('Could not upload that image. Try again.');
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove(): Promise<void> {
    setIsBusy(true);
    try {
      await save(null);
    } catch (error) {
      console.error('Failed to remove cover:', error);
      toast.error('Could not remove the cover. Try again.');
    } finally {
      setIsBusy(false);
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      aria-label="Upload cover photo"
      onChange={(event) => void handleFile(event.target.files?.[0])}
    />
  );

  if (!project.coverImageUrl) {
    return (
      <>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full items-center justify-center gap-2 rounded-card border border-dashed border-olive bg-cream text-sm text-oak transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          <IconPhoto className="size-5 text-sand" aria-hidden="true" />
          {isBusy ? 'Uploading…' : 'Add a cover photo'}
        </button>
        {fileInput}
      </>
    );
  }

  return (
    <div className="relative">
      <div
        ref={frameRef}
        role={isRepositioning ? 'application' : undefined}
        aria-label={isRepositioning ? 'Cover photo position. Drag, or use the arrow keys, to move the photo.' : undefined}
        tabIndex={isRepositioning ? 0 : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={cn(
          'overflow-hidden rounded-card',
          isRepositioning &&
            'cursor-grab touch-none ring-2 ring-fresh active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4'
        )}
      >
        <ProjectCover url={project.coverImageUrl} variant="header" position={shownPosition} />
      </div>

      {isRepositioning && (
        <span className="pointer-events-none absolute top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-white px-3 py-1 text-xs font-medium text-ink">
          <IconArrowsMove className="size-3.5" aria-hidden="true" />
          Drag to reposition
        </span>
      )}

      <div className="absolute right-3 bottom-3 flex flex-wrap justify-end gap-2">
        {isRepositioning ? (
          <>
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => setDraft(null)} className="bg-white">
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={isBusy} onClick={() => void handleSavePosition()}>
              {isBusy ? 'Saving…' : 'Save position'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setDraft(project.coverPosition ?? CENTER)}
              className="bg-white"
            >
              Reposition
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => inputRef.current?.click()} className="bg-white">
              {isBusy ? 'Uploading…' : 'Change cover'}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleRemove()} className="bg-white">
              Remove
            </Button>
          </>
        )}
      </div>
      {fileInput}
    </div>
  );
}
