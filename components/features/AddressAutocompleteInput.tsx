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
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isScriptLoaded = useGoogleMapsScript();

  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode'],
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
  }, [isScriptLoaded, onChange, onAddressSelected]);

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
