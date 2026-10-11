'use client';

import { IconPhoto } from '@tabler/icons-react';
import { useRef, useState } from 'react';

import { ProjectCover } from '@/components/features/ProjectCover';
import { Button } from '@/components/ui/button';
import { MAX_IMAGE_BYTES, uploadImage } from '@/lib/imageUpload';

type CoverImageFieldProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Lets the parent hold its submit button while an upload is in flight. */
  onUploadingChange?: (isUploading: boolean) => void;
};

// Optional project cover — uploads straight to Cloudinary (lib/imageUpload)
// the moment a file is picked, so the dialog only ever saves a URL.
export function CoverImageField({ value, onChange, onUploadingChange }: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setUploading(next: boolean): void {
    setIsUploading(next);
    onUploadingChange?.(next);
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That image is over 10 MB. Try a smaller one.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (uploadError) {
      console.error('Cover upload failed:', uploadError);
      setError('Could not upload that image. Try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <ProjectCover url={value} variant="card" className="rounded-card" />
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-olive bg-cream text-sm text-oak transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          <IconPhoto className="size-6 text-sand" aria-hidden="true" />
          {isUploading ? 'Uploading…' : 'Add a cover photo'}
          <span className="text-xs text-sand">Wide images work best · up to 10 MB</span>
        </button>
      )}

      {value && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
            {isUploading ? 'Uploading…' : 'Replace'}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload cover photo"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
