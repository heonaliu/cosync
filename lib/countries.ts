// Optional "only open in these countries" limit on an opportunity, typed as
// free text and comma separated ("USA, Canada"). Stored as a clean list so
// it can be filtered on later; undefined/empty means open everywhere.
const MAX_COUNTRIES = 20;
const MAX_COUNTRY_LENGTH = 40;

export function parseCountries(input: string): string[] {
  const seen = new Set<string>();
  const countries: string[] = [];
  for (const raw of input.split(',')) {
    const country = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_COUNTRY_LENGTH);
    if (!country || seen.has(country.toLowerCase())) continue;
    seen.add(country.toLowerCase());
    countries.push(country);
  }
  return countries.slice(0, MAX_COUNTRIES);
}

export function isCountryList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim());
}

/** e.g. "USA, Canada only"; null when open everywhere. */
export function formatCountries(countries?: string[]): string | null {
  return countries?.length ? `${countries.join(', ')} only` : null;
}
