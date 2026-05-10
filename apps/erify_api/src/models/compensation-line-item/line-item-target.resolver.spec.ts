import { CompensationLineItemTargetType } from '@prisma/client';

import { LineItemTargetResolver } from './line-item-target.resolver';

describe('lineItemTargetResolver', () => {
  const buildResolver = () => {
    const tx = {
      show: { findFirst: jest.fn() },
      showCreator: { findFirst: jest.fn() },
      studioShift: { findFirst: jest.fn() },
      studioShiftBlock: { findFirst: jest.fn() },
    };

    const resolver = new LineItemTargetResolver({ tx } as any);

    return { resolver, tx };
  };

  it('resolves show targets scoped to a studio', async () => {
    const { resolver, tx } = buildResolver();
    tx.show.findFirst.mockResolvedValue({
      id: 11n,
      studioId: 22n,
      studio: { uid: 'std_1' },
    });

    await expect(
      resolver.resolve({
        studioUid: 'std_1',
        targetType: CompensationLineItemTargetType.SHOW,
        targetUid: 'show_1',
      }),
    ).resolves.toEqual({
      targetId: 11n,
      studioId: 22n,
      studioUid: 'std_1',
      typedForeignKey: { showId: 11n },
    });
  });

  it('rejects studio-less show targets', async () => {
    const { resolver, tx } = buildResolver();
    tx.show.findFirst.mockResolvedValue({
      id: 11n,
      studioId: null,
      studio: null,
    });

    await expect(
      resolver.resolve({
        studioUid: 'std_1',
        targetType: CompensationLineItemTargetType.SHOW,
        targetUid: 'show_1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'LINE_ITEM_TARGET_NOT_FOUND' }),
    });
  });

  it('rejects cross-studio targets', async () => {
    const { resolver, tx } = buildResolver();
    tx.studioShift.findFirst.mockResolvedValue({
      id: 33n,
      studioId: 44n,
      studio: { uid: 'std_other' },
    });

    await expect(
      resolver.resolve({
        studioUid: 'std_1',
        targetType: CompensationLineItemTargetType.STUDIO_SHIFT,
        targetUid: 'ssh_1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'LINE_ITEM_TARGET_NOT_FOUND' }),
    });
  });

  it.each([
    [
      CompensationLineItemTargetType.SHOW_CREATOR,
      'show_mc_1',
      'showCreator',
      { id: 31n, show: { studioId: 22n, studio: { uid: 'std_1' } } },
      { showCreatorId: 31n },
    ],
    [
      CompensationLineItemTargetType.STUDIO_SHIFT,
      'ssh_1',
      'studioShift',
      { id: 41n, studioId: 22n, studio: { uid: 'std_1' } },
      { studioShiftId: 41n },
    ],
    [
      CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK,
      'ssb_1',
      'studioShiftBlock',
      { id: 51n, shift: { studioId: 22n, studio: { uid: 'std_1' } } },
      { studioShiftBlockId: 51n },
    ],
  ] as const)(
    'resolves %s targets',
    async (targetType, targetUid, delegateName, dbTarget, typedForeignKey) => {
      const { resolver, tx } = buildResolver();
      tx[delegateName].findFirst.mockResolvedValue(dbTarget);

      await expect(
        resolver.resolve({
          studioUid: 'std_1',
          targetType,
          targetUid,
        }),
      ).resolves.toEqual({
        targetId: dbTarget.id,
        studioId: 22n,
        studioUid: 'std_1',
        typedForeignKey,
      });
    },
  );
});
