import { canResolverOverwrite, getSourceRank } from './source-priority';

describe('source-priority', () => {
  describe('getSourceRank', () => {
    it('orders MANAGER > PLATFORM > CREATOR_INPUT > OPERATOR > PLANNED', () => {
      expect(getSourceRank('MANAGER')).toBeGreaterThan(getSourceRank('PLATFORM'));
      expect(getSourceRank('PLATFORM')).toBeGreaterThan(getSourceRank('CREATOR_INPUT'));
      expect(getSourceRank('CREATOR_INPUT')).toBeGreaterThan(getSourceRank('OPERATOR'));
      expect(getSourceRank('OPERATOR')).toBeGreaterThan(getSourceRank('PLANNED'));
    });
  });

  describe('canResolverOverwrite', () => {
    it('treats absent recorded source as PLANNED so any active tier wins', () => {
      expect(canResolverOverwrite('OPERATOR', undefined)).toBe(true);
      expect(canResolverOverwrite('PLATFORM', undefined)).toBe(true);
      expect(canResolverOverwrite('MANAGER', undefined)).toBe(true);
    });

    it('allows equal-priority overwrites so a re-submission can correct itself', () => {
      expect(canResolverOverwrite('OPERATOR', 'OPERATOR')).toBe(true);
      expect(canResolverOverwrite('MANAGER', 'MANAGER')).toBe(true);
    });

    it('blocks lower priority from overwriting higher', () => {
      expect(canResolverOverwrite('OPERATOR', 'MANAGER')).toBe(false);
      expect(canResolverOverwrite('OPERATOR', 'PLATFORM')).toBe(false);
      expect(canResolverOverwrite('PLATFORM', 'MANAGER')).toBe(false);
    });

    it('allows higher priority to overwrite lower', () => {
      expect(canResolverOverwrite('MANAGER', 'OPERATOR')).toBe(true);
      expect(canResolverOverwrite('PLATFORM', 'OPERATOR')).toBe(true);
    });
  });
});
