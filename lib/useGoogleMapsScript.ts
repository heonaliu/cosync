'use client';

import { useEffect, useState } from 'react';

// Minimal ambient types for just the pieces we use — not pulling in the
// full @types/google.maps package for one widget.
export type GooglePlaceResult = {
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

export type GoogleAutocompleteInstance = {
  addListener: (event: 'place_changed', handler: () => void) => void;
  getPlace: () => GooglePlaceResult;
};

type GoogleMapsNamespace = {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: { types?: string[] }
      ) => GoogleAutocompleteInstance;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

// Returns false (and never attempts to load anything) when the API key
// isn't configured — AddressAutocompleteInput falls back to a plain text
// field in that case, so this feature is inert until a real key is added
// to .env.local, rather than erroring.
export function useGoogleMapsScript(): boolean {
  const [isLoaded, setIsLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    loadScript(apiKey)
      .then(() => {
        if (!cancelled) setIsLoaded(true);
      })
      .catch((error: unknown) => {
        console.error('Google Maps script failed to load:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return isLoaded;
}
