import { Prisma } from '@prisma/client';

import { CreatorCompensationService } from './creator-compensation.service';

import type { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
import type { ShowService } from '@/models/show/show.service';
import type { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import type { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

describe('creatorCompensationService', () => {
  let service: CreatorCompensationService;
  let showService: { getShowById: jest.Mock };
  let compensationLineItemService: { sumActiveAmountsByShowCreatorUids: jest.Mock };
  let studioCreatorRepository: { findByStudioUidAndCreatorUid: jest.Mock };
  let showCreatorRepository: { findCompensationReviewRows: jest.Mock };

  const mockShow = { uid: 'show_1' };

  beforeEach(() => {
    showService = { getShowById: jest.fn() };
    compensationLineItemService = { sumActiveAmountsByShowCreatorUids: jest.fn() };
    studioCreatorRepository = { findByStudioUidAndCreatorUid: jest.fn() };
    showCreatorRepository = { findCompensationReviewRows: jest.fn() };

    service = new CreatorCompensationService(
      showService as unknown as ShowService,
      compensationLineItemService as unknown as CompensationLineItemService,
      studioCreatorRepository as unknown as StudioCreatorRepository,
      showCreatorRepository as unknown as ShowCreatorRepository,
    );
  });

  describe('getCreatorCompensationSummaryForShow', () => {
    it('calculates fixed assignment totals from backend line items', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            uid: 'show_mc_1',
            note: null,
            agreedRate: '100.00',
            compensationType: 'FIXED',
            commissionRate: null,
            metadata: {},
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([['show_mc_1', new Prisma.Decimal('20.00')]]),
      );

      const result = await service.getCreatorCompensationSummaryForShow('std_123', mockShow.uid);

      expect(compensationLineItemService.sumActiveAmountsByShowCreatorUids).toHaveBeenCalledWith({
        studioId: 'std_123',
        showCreatorUids: ['show_mc_1'],
      });
      expect(result).toEqual({
        showId: mockShow.uid,
        creators: [
          expect.objectContaining({
            showCreatorId: 'show_mc_1',
            creatorId: 'creator_1',
            baseAmount: '100.00',
            adjustmentTotal: '20.00',
            totalAmount: '120.00',
            unresolvedReason: null,
          }),
        ],
        totalAmount: '120.00',
        unresolvedCount: 0,
      });
    });

    it('marks HYBRID rows unresolved because their total depends on commission revenue', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            uid: 'show_mc_hybrid',
            note: null,
            agreedRate: '50.00',
            compensationType: 'HYBRID',
            commissionRate: '10.00',
            metadata: {},
            creator: {
              uid: 'creator_2',
              name: 'Bea',
              aliasName: 'Bea',
            },
          },
        ],
      } as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([['show_mc_hybrid', new Prisma.Decimal('5.00')]]),
      );

      const result = await service.getCreatorCompensationSummaryForShow('std_123', mockShow.uid);

      expect(result).toEqual({
        showId: mockShow.uid,
        creators: [
          expect.objectContaining({
            showCreatorId: 'show_mc_hybrid',
            baseAmount: '50.00',
            adjustmentTotal: '5.00',
            totalAmount: null,
            unresolvedReason: 'COMMISSION_REVENUE_NOT_AVAILABLE',
          }),
        ],
        totalAmount: '0.00',
        unresolvedCount: 1,
      });
    });
  });

  describe('getCreatorCompensations', () => {
    it('aggregates creator compensation across show assignments in the date range', async () => {
      const dateFrom = new Date('2026-05-01T00:00:00.000Z');
      const dateTo = new Date('2026-05-31T23:59:59.999Z');
      studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue({
        creator: {
          uid: 'creator_1',
          name: 'Alice',
          aliasName: 'Ali',
        },
      } as any);
      showCreatorRepository.findCompensationReviewRows.mockResolvedValue([
        {
          uid: 'show_mc_1',
          note: 'Existing note',
          agreedRate: new Prisma.Decimal('100.00'),
          compensationType: 'FIXED',
          commissionRate: null,
          show: {
            uid: 'show_1',
            name: 'May Show',
            startTime: new Date('2026-05-10T10:00:00.000Z'),
            endTime: new Date('2026-05-10T12:00:00.000Z'),
          },
          creator: {
            uid: 'creator_1',
            name: 'Alice',
            aliasName: 'Ali',
          },
        },
        {
          uid: 'show_mc_2',
          note: null,
          agreedRate: null,
          compensationType: null,
          commissionRate: null,
          show: {
            uid: 'show_2',
            name: 'Incomplete Show',
            startTime: new Date('2026-05-12T10:00:00.000Z'),
            endTime: new Date('2026-05-12T12:00:00.000Z'),
          },
          creator: {
            uid: 'creator_1',
            name: 'Alice',
            aliasName: 'Ali',
          },
        },
      ] as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([
          ['show_mc_1', new Prisma.Decimal('25.00')],
          ['show_mc_2', new Prisma.Decimal('5.00')],
        ]),
      );

      const result = await service.getCreatorCompensations('std_123', 'creator_1', {
        dateFrom,
        dateTo,
      });

      expect(studioCreatorRepository.findByStudioUidAndCreatorUid)
        .toHaveBeenCalledWith('std_123', 'creator_1');
      expect(showCreatorRepository.findCompensationReviewRows).toHaveBeenCalledWith({
        studioUid: 'std_123',
        creatorUid: 'creator_1',
        dateFrom,
        dateTo,
      });
      expect(compensationLineItemService.sumActiveAmountsByShowCreatorUids).toHaveBeenCalledWith({
        studioId: 'std_123',
        showCreatorUids: ['show_mc_1', 'show_mc_2'],
      });
      expect(result).toEqual(expect.objectContaining({
        creatorId: 'creator_1',
        totalAmount: '125.00',
        unresolvedCount: 1,
        shows: [
          expect.objectContaining({
            showId: 'show_1',
            note: 'Existing note',
            totalAmount: '125.00',
          }),
          expect.objectContaining({
            showId: 'show_2',
            note: null,
            totalAmount: null,
            unresolvedReason: 'AGREEMENT_SNAPSHOT_MISSING',
          }),
        ],
      }));
    });
  });
});
