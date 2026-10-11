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

// A card-sized preview of longer text: line breaks and runs of whitespace
// collapse to single spaces (the full text, line breaks intact, lives in a
// details view), then it's cut at the last word boundary before maxLength.
export function truncateText(text: string, maxLength = 150): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= maxLength) return flat
  const cut = flat.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
