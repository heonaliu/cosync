// Image uploads go to Cloudinary's free tier, not Firebase Storage — Cloud
// Storage for Firebase now requires the paid Blaze plan even to provision a
// bucket at all (a policy change, not something CoSync's own setup got
// wrong), which isn't acceptable for a project that needs to run at $0.
// Cloudinary's "unsigned upload" flow is the standard workaround for
// exactly this: a client-side POST straight to Cloudinary with an upload
// preset (no API secret, so nothing sensitive ever ships to the browser —
// see .env.local.example for how the two env vars below get set up).
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Uploads one image and returns its real, permanent Cloudinary URL — never
// a placeholder or a claude.ai/Anthropic-internal URL scheme, since this is
// what gets embedded directly into post/comment content.
export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Image uploads are not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (see .env.local.example).'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Upload failed with status ${response.status}`);
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Upload succeeded but no URL came back');
  return data.secure_url;
}

// Cloudinary's free tier rejects anything bigger on upload anyway — checked
// up front so people get a clear message instead of a failed request.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const CLOUDINARY_UPLOAD_URL = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** Only URLs our own uploads produce — anything else stored on a doc
 * (e.g. hand-edited in the Firebase Console) is ignored, not rendered. */
export function isCloudinaryImageUrl(url: unknown): url is string {
  return typeof url === 'string' && CLOUDINARY_UPLOAD_URL.test(url);
}

// Cloudinary resizes on its CDN when a transformation is inserted right
// after /upload/ — so a 4000px phone photo is served as a light, right-sized
// image. Only scaled down, never cropped: the crop happens in CSS
// (object-cover + the owner's chosen object-position, see ProjectCover), so
// dragging to reposition can show any part of the photo. f_auto/q_auto pick
// the best format and quality for the viewer's browser.
export function toCloudinaryCover(url: string, width: number): string {
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},f_auto,q_auto/`);
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
