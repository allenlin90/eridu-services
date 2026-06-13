import { parseStudioLocalization } from './studio-localization.schema';

describe('parseStudioLocalization', () => {
  it('extracts a well-formed localization block unchanged', () => {
    expect(
      parseStudioLocalization({ localization: { locale: 'en-US', currency: 'USD' } }),
    ).toEqual({ locale: 'en-US', currency: 'USD' });
  });

  it('returns an empty object when metadata has no localization', () => {
    expect(parseStudioLocalization({ other: true })).toEqual({});
  });

  it('returns an empty object for null / non-object metadata (no throw)', () => {
    expect(parseStudioLocalization(null)).toEqual({});
    expect(parseStudioLocalization(undefined)).toEqual({});
    expect(parseStudioLocalization('th-TH')).toEqual({});
  });

  it('falls back to an empty object when a localization field is the wrong type', () => {
    // Malformed (non-string locale) → fall back rather than surface a bad value;
    // the caller then applies platform defaults.
    expect(parseStudioLocalization({ localization: { locale: 123 } })).toEqual({});
  });

  it('keeps a partial localization (only one field present)', () => {
    expect(parseStudioLocalization({ localization: { currency: 'THB' } })).toEqual({
      currency: 'THB',
    });
  });
});
