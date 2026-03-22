import { describe, expect, it } from 'vitest';

import { hasLegacyPageSizeParam } from '../legacy-page-size-url';

describe('hasLegacyPageSizeParam', () => {
  it('returns false when the URL is already canonical', () => {
    expect(hasLegacyPageSizeParam('?page=1&limit=20')).toBe(false);
  });

  it('returns true when pageSize is present by itself', () => {
    expect(hasLegacyPageSizeParam('?page=1&pageSize=25')).toBe(true);
  });

  it('returns true when pageSize appears alongside limit', () => {
    expect(hasLegacyPageSizeParam('?page=1&limit=20&pageSize=25')).toBe(true);
  });
});
