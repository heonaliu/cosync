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
    /** Google calls this global when the key is rejected — wrong referrer
     * (RefererNotAllowedMapError), API not enabled, billing off, etc. */
    gm_authFailure?: () => void;
    __cosyncMapsReady?: () => void;
  }
}

/** 'idle' = no key configured or still loading; 'failed' = the script
 * didn't load or Google rejected the key. Either way, callers should be a
 * plain text input. */
export type GoogleMapsStatus = 'idle' | 'ready' | 'failed';

let scriptLoadPromise: Promise<void> | null = null;
let authFailed = false;
const authFailureListeners = new Set<() => void>();

function loadScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  // Installed before the script tag so a rejection during load is caught
  // too. Google only *logs* the error and greys out any widget it attached —
  // this is the one hook it gives us to react to it.
  window.gm_authFailure = () => {
    authFailed = true;
    authFailureListeners.forEach((listener) => listener());
  };

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    // loading=async + callback is Google's recommended pattern; the
    // callback (not script.onload) is what signals the places library is
    // actually ready to use.
    window.__cosyncMapsReady = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__cosyncMapsReady`;
    script.async = true;
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

// Never attempts to load anything when the API key isn't configured —
// AddressAutocompleteInput is a plain text field in that case, so this
// feature is inert until a real key is added, rather than erroring.
export function useGoogleMapsScript(): GoogleMapsStatus {
  const [status, setStatus] = useState<GoogleMapsStatus>(authFailed ? 'failed' : 'idle');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    const handleAuthFailure = (): void => {
      if (!cancelled) setStatus('failed');
    };
    authFailureListeners.add(handleAuthFailure);

    loadScript(apiKey)
      .then(() => {
        if (!cancelled) setStatus(authFailed ? 'failed' : 'ready');
      })
      .catch((error: unknown) => {
        console.error('Google Maps script failed to load:', error);
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      authFailureListeners.delete(handleAuthFailure);
    };
  }, [apiKey]);

  return status;
}
