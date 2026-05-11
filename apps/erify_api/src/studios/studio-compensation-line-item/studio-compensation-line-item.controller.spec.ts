import { CompensationItemType, CompensationLineItemTargetType } from '@prisma/client';

import { StudioCompensationLineItemController } from './studio-compensation-line-item.controller';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import type { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';

describe('studioCompensationLineItemController', () => {
  const buildController = () => {
    const service = {
      createStudioLineItem: jest.fn(),
      listStudioLineItems: jest.fn(),
      updateStudioLineItem: jest.fn(),
      deleteStudioLineItem: jest.fn(),
    } as unknown as jest.Mocked<CompensationLineItemService>;
    const controller = new StudioCompensationLineItemController(service);

    return { controller, service };
  };

  const user = { ext_id: 'ext_1' } as AuthenticatedUser;
  const body = {
    amount: '10.00',
    itemType: CompensationItemType.BONUS,
    reason: 'bonus',
    targetType: CompensationLineItemTargetType.SHOW,
    targetId: 'show_1',
    metadata: {},
  };
  const query = {
    page: 1,
    limit: 20,
    skip: 0,
    take: 20,
    sort: 'desc' as const,
    targetType: CompensationLineItemTargetType.SHOW_CREATOR,
    targetId: 'show_mc_1',
    itemType: undefined,
    from: undefined,
    to: undefined,
    includeDeleted: false,
  };

  it('creates line items using the studio route and body target', async () => {
    const { controller, service } = buildController();
    service.createStudioLineItem.mockResolvedValue({ uid: 'cli_1' } as never);

    await controller.createLineItem('std_1', body, user);

    expect(service.createStudioLineItem).toHaveBeenCalledWith(
      'std_1',
      body,
      'ext_1',
    );
  });

  it('lists line items through studio-scoped target filters', async () => {
    const { controller, service } = buildController();
    service.listStudioLineItems.mockResolvedValue({
      data: [{ uid: 'cli_1' }],
      total: 1,
    } as never);

    const result = await controller.listLineItems('std_1', query);

    expect(service.listStudioLineItems).toHaveBeenCalledWith({
      studioId: 'std_1',
      targetType: CompensationLineItemTargetType.SHOW_CREATOR,
      targetId: 'show_mc_1',
      itemType: undefined,
      from: undefined,
      to: undefined,
      skip: 0,
      take: 20,
      sort: 'desc',
      includeDeleted: false,
    });
    expect(result).toEqual({
      data: [{ uid: 'cli_1' }],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('updates line items through the studio-scoped line item route', async () => {
    const { controller, service } = buildController();
    service.updateStudioLineItem.mockResolvedValue({ uid: 'cli_1' } as never);

    await controller.updateLineItem('std_1', 'cli_1', {
      reason: 'corrected',
    } as never);

    expect(service.updateStudioLineItem).toHaveBeenCalledWith(
      { studioId: 'std_1', lineItemId: 'cli_1' },
      { reason: 'corrected' },
    );
  });

  it('soft deletes line items through the studio-scoped line item route', async () => {
    const { controller, service } = buildController();
    service.deleteStudioLineItem.mockResolvedValue({ uid: 'cli_1' } as never);

    await controller.deleteLineItem('std_1', 'cli_1');

    expect(service.deleteStudioLineItem).toHaveBeenCalledWith({
      studioId: 'std_1',
      lineItemId: 'cli_1',
    });
  });

  it('maps missing studio-scoped line items to not found', async () => {
    const { controller, service } = buildController();
    service.updateStudioLineItem.mockResolvedValue(null);

    await expect(
      controller.updateLineItem('std_1', 'cli_missing', {
        reason: 'missing',
      } as never),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 404,
      }),
    });
  });
});
