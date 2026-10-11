import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// People type "github.com/me/thing" as often as the full URL. Without a
// scheme, an href resolves relative to the current page (/clubs/github.com/…),
// so add https:// whenever there isn't one already.
export function toExternalHref(url: string): string {
  const trimmed = url.trim()
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}
