'use client';

import { useEffect, useRef } from 'react';

import { Input } from '@/components/ui/Input';
import { useGoogleMapsScript } from '@/lib/useGoogleMapsScript';

type AddressAutocompleteInputProps = {
  id?: string;
  placeholder?: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  onAddressSelected: (result: { address: string; lat: number; lng: number }) => void;
  /** Places Autocomplete's `types` filter. Defaults to 'geocode' (any
   * address, matching an opportunity's specific venue). LocationField
   * passes '(cities)' instead, so a viewer's own saved location can only
   * ever resolve to a city-level point, not a street address — see
   * lib/location.ts's getDistanceMiles for why that distinction matters. */
  types?: string[];
};

// Free text ("Online", "Remote") passes through untouched — this only
// enhances the field when Google actually has a matching place. No separate
// "is this online?" toggle: typing something Places doesn't recognize just
// behaves like a plain input, so one field covers both cases.
//
// The input is intentionally uncontrolled (defaultValue, not value) — the
// Places widget mutates the underlying DOM input directly when a suggestion
// is picked, which would fight a React-controlled value on every keystroke.
export function AddressAutocompleteInput({
  id,
  placeholder,
  defaultValue,
  onChange,
  onAddressSelected,
  types = ['geocode'],
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isScriptLoaded = useGoogleMapsScript();

  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types,
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      if (place.formatted_address && lat !== undefined && lng !== undefined) {
        onChange(place.formatted_address);
        onAddressSelected({ address: place.formatted_address, lat, lng });
      }
    });
    // Google's widget has no teardown API to speak of — it attaches
    // listeners to the input node itself, which unmounts along with this
    // component, so there's nothing to clean up here.
    // types.join(',') rather than `types` itself — callers that pass an
    // inline array literal (e.g. types={['(cities)']}) would otherwise hand
    // this effect a new array reference every render, re-running it (and
    // re-attaching a fresh Autocomplete with no way to tear down the old
    // one) even though the actual filter never changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScriptLoaded, onChange, onAddressSelected, types.join(',')]);

  return (
    <Input
      ref={inputRef}
      id={id}
      placeholder={placeholder}
      defaultValue={defaultValue}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
