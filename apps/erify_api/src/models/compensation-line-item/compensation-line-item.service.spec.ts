import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CompensationItemType, CompensationLineItemTargetType } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { CompensationLineItemRepository } from './compensation-line-item.repository';
import { CompensationLineItemService } from './compensation-line-item.service';
import { LineItemTargetResolver } from './line-item-target.resolver';

import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('compensationLineItemService', () => {
  const buildService = async () => {
    const repository = {
      create: jest.fn(),
      findByUidWithRelations: jest.fn(),
      findByUidForStudio: jest.fn(),
      findPaginated: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<CompensationLineItemRepository>;
    const targetResolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<LineItemTargetResolver>;
    const userService = {
      getUserByExtId: jest.fn(),
    };
    const utilityService = {
      generateBrandedId: jest.fn().mockReturnValue('cli_generated'),
    };

    const module = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      providers: [
        CompensationLineItemService,
        { provide: CompensationLineItemRepository, useValue: repository },
        { provide: LineItemTargetResolver, useValue: targetResolver },
        { provide: UserService, useValue: userService },
        { provide: UtilityService, useValue: utilityService },
      ],
    }).compile();

    const service = module.get(CompensationLineItemService);

    return { service, repository, targetResolver, userService, utilityService };
  };

  it('creates an admin line item with actor, studio, and nested target row', async () => {
    const { service, repository, targetResolver, userService } = await buildService();
    userService.getUserByExtId.mockResolvedValue({ id: 70n, uid: 'user_1' });
    targetResolver.resolve.mockResolvedValue({
      targetId: 11n,
      studioId: 22n,
      studioUid: 'std_1',
    });
    repository.create.mockResolvedValue({ uid: 'cli_generated' } as never);

    await service.createAdminLineItem({
      studioId: 'std_1',
      targetType: CompensationLineItemTargetType.SHOW,
      targetId: 'show_1',
      amount: '10.25',
      itemType: CompensationItemType.BONUS,
      reason: 'bonus',
      metadata: { source: 'test' },
    }, 'ext_1');

    expect(repository.create).toHaveBeenCalledWith({
      uid: 'cli_generated',
      amount: '10.25',
      itemType: CompensationItemType.BONUS,
      reason: 'bonus',
      studio: { connect: { id: 22n } },
      createdBy: { connect: { id: 70n } },
      metadata: { source: 'test' },
      target: {
        create: {
          targetType: CompensationLineItemTargetType.SHOW,
          targetId: 11n,
          show: { connect: { id: 11n } },
        },
      },
    });
  });

  it('creates a studio line item from route studio and body target', async () => {
    const { service, repository, targetResolver, userService } = await buildService();
    userService.getUserByExtId.mockResolvedValue({ id: 70n, uid: 'user_1' });
    targetResolver.resolve.mockResolvedValue({
      targetId: 11n,
      studioId: 22n,
      studioUid: 'std_1',
    });
    repository.create.mockResolvedValue({ uid: 'cli_generated' } as never);

    await service.createStudioLineItem(
      'std_1',
      {
        targetType: CompensationLineItemTargetType.SHOW_CREATOR,
        targetId: 'show_mc_1',
        amount: '-5.00',
        itemType: CompensationItemType.DEDUCTION,
        reason: 'chargeback',
        metadata: {},
      },
      'ext_1',
    );

    expect(targetResolver.resolve).toHaveBeenCalledWith({
      studioUid: 'std_1',
      targetType: CompensationLineItemTargetType.SHOW_CREATOR,
      targetId: 'show_mc_1',
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'cli_generated',
      amount: '-5.00',
      itemType: CompensationItemType.DEDUCTION,
      reason: 'chargeback',
      studio: { connect: { id: 22n } },
      createdBy: { connect: { id: 70n } },
      target: {
        create: {
          targetType: CompensationLineItemTargetType.SHOW_CREATOR,
          targetId: 11n,
          showCreator: { connect: { id: 11n } },
        },
      },
    }));
  });

  it('lists studio line items through studio-scoped filters', async () => {
    const { service, repository } = await buildService();
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    await service.listStudioLineItems({
      studioId: 'std_1',
      targetType: CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK,
      targetId: 'ssb_1',
      itemType: CompensationItemType.OVERTIME,
      skip: 20,
      take: 20,
      sort: 'desc',
      includeDeleted: false,
    });

    expect(repository.findPaginated).toHaveBeenCalledWith({
      studioId: 'std_1',
      targetType: CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK,
      targetId: 'ssb_1',
      itemType: CompensationItemType.OVERTIME,
      skip: 20,
      take: 20,
      sort: 'desc',
      includeDeleted: false,
    });
  });

  it('requires a resolvable actor for create', async () => {
    const { service, userService } = await buildService();
    userService.getUserByExtId.mockResolvedValue(null);

    await expect(
      service.createAdminLineItem({
        studioId: 'std_1',
        targetType: CompensationLineItemTargetType.SHOW,
        targetId: 'show_1',
        amount: '10.25',
        itemType: CompensationItemType.BONUS,
        reason: 'bonus',
        metadata: {},
      }, 'missing_ext'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'LINE_ITEM_ACTOR_NOT_FOUND' }),
    });
  });

  it('updates only mutable fields', async () => {
    const { service, repository } = await buildService();
    repository.findByUidWithRelations.mockResolvedValue({ id: 99n, uid: 'cli_1' } as never);
    repository.update.mockResolvedValue({ uid: 'cli_1' } as never);

    await service.updateAdminLineItem('cli_1', {
      amount: '12.00',
      itemType: CompensationItemType.OTHER,
      reason: 'corrected',
      metadata: { source: 'support' },
    });

    expect(repository.update).toHaveBeenCalledWith(
      { id: 99n },
      {
        amount: '12.00',
        itemType: CompensationItemType.OTHER,
        reason: 'corrected',
        metadata: { source: 'support' },
      },
      expect.any(Object),
    );
  });

  it('updates only studio-scoped line items', async () => {
    const { service, repository } = await buildService();
    repository.findByUidForStudio.mockResolvedValue({ id: 99n, uid: 'cli_1' } as never);
    repository.update.mockResolvedValue({ uid: 'cli_1' } as never);

    await service.updateStudioLineItem(
      {
        studioId: 'std_1',
        lineItemId: 'cli_1',
      },
      {
        amount: '12.00',
        itemType: CompensationItemType.OTHER,
        reason: 'corrected',
      } as never,
    );

    expect(repository.findByUidForStudio).toHaveBeenCalledWith({
      uid: 'cli_1',
      studioId: 'std_1',
    });
    expect(repository.update).toHaveBeenCalledWith(
      { id: 99n },
      {
        amount: '12.00',
        itemType: CompensationItemType.OTHER,
        reason: 'corrected',
      },
      expect.any(Object),
    );
  });

  it('soft deletes only studio-scoped line items', async () => {
    const { service, repository } = await buildService();
    repository.findByUidForStudio.mockResolvedValue({ id: 99n, uid: 'cli_1' } as never);
    repository.softDelete.mockResolvedValue({ uid: 'cli_1' } as never);

    await service.deleteStudioLineItem({
      studioId: 'std_1',
      lineItemId: 'cli_1',
    });

    expect(repository.findByUidForStudio).toHaveBeenCalledWith({
      uid: 'cli_1',
      studioId: 'std_1',
    });
    expect(repository.softDelete).toHaveBeenCalledWith({ id: 99n });
  });
});
