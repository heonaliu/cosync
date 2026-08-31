import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

// Storage path is posts/{postId}/{timestamp}-{filename} — postId is the
// Firestore doc id of whichever journal entry, discussion, or comment this
// image belongs to (composers generate that id up front via lib/firestoreId
// so it exists before the doc itself is written). The filename is
// sanitized to safe characters only so it can't smuggle extra path
// segments (e.g. "../", or a literal "/") into the Storage path.
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Uploads one image and returns its real Firebase Storage download URL —
// never a placeholder or a claude.ai/Anthropic-internal URL scheme, since
// this is what gets embedded directly into post/comment content.
export async function uploadPostImage(postId: string, file: File): Promise<string> {
  const path = `posts/${postId}/${Date.now()}-${sanitizeFileName(file.name || 'image')}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// The markdown-image tag this app renders inline — see
// components/features/RichContent.tsx for the render side.
export function toImageMarkdown(url: string, alt: string): string {
  return `![${alt}](${url})`;
}

// Pulls the first image out of a paste event's clipboard, if any — used to
// tell "someone pasted an image" apart from "someone pasted plain text".
export function getPastedImageFile(event: React.ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}
