import { AdminCompensationLineItemController } from './admin-compensation-line-item.controller';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import type { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';

describe('adminCompensationLineItemController', () => {
  const buildController = () => {
    const service = {
      createAdminLineItem: jest.fn(),
      listAdminLineItems: jest.fn(),
      getAdminLineItem: jest.fn(),
      updateAdminLineItem: jest.fn(),
      deleteAdminLineItem: jest.fn(),
    } as unknown as jest.Mocked<CompensationLineItemService>;
    const controller = new AdminCompensationLineItemController(service);

    return { controller, service };
  };

  const user = { ext_id: 'ext_1' } as AuthenticatedUser;

  it('passes the authenticated actor to create', async () => {
    const { controller, service } = buildController();
    service.createAdminLineItem.mockResolvedValue({ id: 'cli_1' } as never);

    await controller.createLineItem({
      studioId: 'std_1',
      targetType: 'SHOW' as never,
      targetId: 'show_1',
      amount: '10.00',
      itemType: 'BONUS' as never,
      reason: 'bonus',
      metadata: {},
    }, user);

    expect(service.createAdminLineItem).toHaveBeenCalledWith({
      studioId: 'std_1',
      targetType: 'SHOW',
      targetId: 'show_1',
      amount: '10.00',
      itemType: 'BONUS',
      reason: 'bonus',
      metadata: {},
    }, 'ext_1');
  });

  it('returns paginated list responses', async () => {
    const { controller, service } = buildController();
    service.listAdminLineItems.mockResolvedValue({
      data: [{ id: 'cli_1' }],
      total: 1,
    } as never);

    const result = await controller.listLineItems({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
      sort: 'desc',
      includeDeleted: false,
    } as never);

    expect(result).toEqual({
      data: [{ id: 'cli_1' }],
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

  it('maps missing line items to the admin not-found helper', async () => {
    const { controller, service } = buildController();
    service.getAdminLineItem.mockResolvedValue(null);

    await expect(controller.getLineItem('cli_missing')).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 404,
      }),
    });
  });
});
