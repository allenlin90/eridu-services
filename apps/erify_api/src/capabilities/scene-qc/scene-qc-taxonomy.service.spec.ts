import { SceneQcTaxonomyService } from './scene-qc-taxonomy.service';

function buildHarness() {
  const tx = {
    sceneQcTaxonomyElement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sceneQcTaxonomyDefect: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const uidGenerator = {
    generateBrandedId: jest.fn()
      .mockReturnValueOnce('scqce_custom1')
      .mockReturnValueOnce('scqcd_custom1'),
  };
  const userService = {
    getUserByExtId: jest.fn().mockResolvedValue({ id: 7n }),
  };
  const service = new SceneQcTaxonomyService(
    { tx } as never,
    uidGenerator as never,
    userService as never,
  );
  return { service, tx };
}

describe('sceneQcTaxonomyService', () => {
  it('creates organization-wide custom entries without a studio scope', async () => {
    const { service, tx } = buildHarness();
    tx.sceneQcTaxonomyElement.create.mockResolvedValue({
      uid: 'scqce_custom1',
      key: 'scqce_custom1',
      label: 'Sponsor logo',
      appliesToGraphicBg: true,
      appliesToRealBackdrop: false,
      isSystem: false,
      retiredAt: null,
      defects: [],
    });

    await service.createElement(
      { label: 'Sponsor logo', applies_to: ['GRAPHIC_BG'] },
      'ext_actor1',
    );

    expect(tx.sceneQcTaxonomyElement.create).toHaveBeenCalledWith({
      data: {
        uid: 'scqce_custom1',
        key: 'scqce_custom1',
        label: 'Sponsor logo',
        appliesToGraphicBg: true,
        appliesToRealBackdrop: false,
        createdById: 7n,
      },
      include: expect.any(Object),
    });
  });

  it('requires overlap findings to identify a different related element', async () => {
    const { service, tx } = buildHarness();
    tx.sceneQcTaxonomyElement.findMany.mockResolvedValue([
      {
        id: 1n,
        uid: 'scqce_primary1',
        key: 'logo',
        label: 'Logo',
        appliesToGraphicBg: true,
        appliesToRealBackdrop: true,
      },
    ]);
    tx.sceneQcTaxonomyDefect.findMany.mockResolvedValue([
      {
        id: 2n,
        uid: 'scqcd_overlap1',
        key: 'overlap',
        label: 'Overlap',
        elementId: 1n,
      },
    ]);

    await expect(service.resolveFindings([{
      element_id: 'scqce_primary1',
      defect_id: 'scqcd_overlap1',
      related_element_id: null,
    }], 'GRAPHIC_BG')).rejects.toThrow(/require a related element/);
  });

  it.each([
    ['a non-overlap finding', 'misaligned'],
    ['an overlap finding', 'overlap'],
  ])('rejects an unknown related element for %s instead of silently dropping it', async (_case, defectKey) => {
    const { service, tx } = buildHarness();
    tx.sceneQcTaxonomyElement.findMany.mockResolvedValue([
      {
        id: 1n,
        uid: 'scqce_primary1',
        key: 'logo',
        label: 'Logo',
        appliesToGraphicBg: true,
        appliesToRealBackdrop: true,
      },
    ]);
    tx.sceneQcTaxonomyDefect.findMany.mockResolvedValue([
      {
        id: 2n,
        uid: 'scqcd_defect1',
        key: defectKey,
        label: defectKey === 'overlap' ? 'Overlap' : 'Misaligned',
        elementId: 1n,
      },
    ]);

    await expect(service.resolveFindings([{
      element_id: 'scqce_primary1',
      defect_id: 'scqcd_defect1',
      related_element_id: 'scqce_unknown1',
    }], 'GRAPHIC_BG')).rejects.toThrow('Scene QC related element is invalid or retired');
  });

  it('snapshots labels and keys for immutable historical findings', async () => {
    const { service, tx } = buildHarness();
    tx.sceneQcTaxonomyElement.findMany.mockResolvedValue([
      {
        id: 1n,
        uid: 'scqce_primary1',
        key: 'logo',
        label: 'Logo',
        appliesToGraphicBg: true,
        appliesToRealBackdrop: true,
      },
      {
        id: 3n,
        uid: 'scqce_related1',
        key: 'headline',
        label: 'Headline',
        appliesToGraphicBg: true,
        appliesToRealBackdrop: false,
      },
    ]);
    tx.sceneQcTaxonomyDefect.findMany.mockResolvedValue([
      {
        id: 2n,
        uid: 'scqcd_overlap1',
        key: 'overlap',
        label: 'Overlap',
        elementId: 1n,
      },
    ]);

    await expect(service.resolveFindings([{
      element_id: 'scqce_primary1',
      defect_id: 'scqcd_overlap1',
      related_element_id: 'scqce_related1',
    }], 'GRAPHIC_BG')).resolves.toEqual([{
      sortOrder: 0,
      elementId: 1n,
      elementKey: 'logo',
      elementLabel: 'Logo',
      defectId: 2n,
      defectKey: 'overlap',
      defectLabel: 'Overlap',
      relatedElementId: 3n,
      relatedElementKey: 'headline',
      relatedElementLabel: 'Headline',
    }]);
  });
});
