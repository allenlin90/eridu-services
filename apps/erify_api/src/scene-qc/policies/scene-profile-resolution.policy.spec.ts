import {
  isMaterialLinkApplicable,
  resolveSceneProfile,
  selectApplicableMaterials,
} from './scene-profile-resolution.policy';

describe('resolveSceneProfile', () => {
  const assigned = { uid: 'scprof_assigned' };
  const clientDefault = { uid: 'scprof_default' };

  it('prefers the explicit Show assignment over the Client default', () => {
    expect(
      resolveSceneProfile({ assignedProfile: assigned, clientDefaultProfile: clientDefault }),
    ).toEqual({ source: 'SHOW_ASSIGNMENT', profile: assigned });
  });

  it('falls back to the Client default when no assignment exists', () => {
    expect(
      resolveSceneProfile({ assignedProfile: null, clientDefaultProfile: clientDefault }),
    ).toEqual({ source: 'CLIENT_DEFAULT', profile: clientDefault });
  });

  it('resolves NONE when neither an assignment nor a default exists', () => {
    expect(
      resolveSceneProfile({ assignedProfile: null, clientDefaultProfile: null }),
    ).toEqual({ source: 'NONE', profile: null });
  });
});

describe('isMaterialLinkApplicable', () => {
  const studioId = 1n;
  const context = { studioId, platformIds: [10n, 20n] };

  it('applies an unscoped link everywhere', () => {
    expect(isMaterialLinkApplicable({ studioId: null, platformId: null }, context)).toBe(true);
  });

  it('applies a studio-only link when the studio matches', () => {
    expect(isMaterialLinkApplicable({ studioId, platformId: null }, context)).toBe(true);
  });

  it('excludes a studio-only link when the studio does not match', () => {
    expect(isMaterialLinkApplicable({ studioId: 2n, platformId: null }, context)).toBe(false);
  });

  it('applies a platform-only link when the platform is among the Show platforms', () => {
    expect(isMaterialLinkApplicable({ studioId: null, platformId: 10n }, context)).toBe(true);
  });

  it('excludes a platform-only link when the platform is not among the Show platforms', () => {
    expect(isMaterialLinkApplicable({ studioId: null, platformId: 99n }, context)).toBe(false);
  });

  it('applies a studio+platform link only when both match', () => {
    expect(isMaterialLinkApplicable({ studioId, platformId: 10n }, context)).toBe(true);
    expect(isMaterialLinkApplicable({ studioId, platformId: 99n }, context)).toBe(false);
    expect(isMaterialLinkApplicable({ studioId: 2n, platformId: 10n }, context)).toBe(false);
  });
});

describe('selectApplicableMaterials', () => {
  const context = { studioId: 1n, platformIds: [10n] };

  it('filters to applicable links and preserves sortOrder', () => {
    const links = [
      { sortOrder: 2, studioId: null, platformId: null, label: 'b' },
      { sortOrder: 0, studioId: 2n, platformId: null, label: 'excluded-studio' },
      { sortOrder: 1, studioId: null, platformId: 10n, label: 'a' },
    ];

    expect(selectApplicableMaterials(links, context).map((l) => l.label)).toEqual(['a', 'b']);
  });
});
