import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { GoogleSheetsCreatorController } from './google-sheets-creator.controller';

import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

describe('googleSheetsCreatorController', () => {
  let controller: GoogleSheetsCreatorController;
  let studioCreatorRepository: jest.Mocked<StudioCreatorRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleSheetsCreatorController],
      providers: [
        {
          provide: StudioCreatorRepository,
          useValue: {
            findActiveRosterWithUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GoogleSheetsCreatorController>(GoogleSheetsCreatorController);
    studioCreatorRepository = module.get(StudioCreatorRepository);
  });

  it('should get and map active creators with linked user details', async () => {
    const studioId = 'std_OBXMKm0gW4IGQUNQzp4E';
    const mockRosterData = [
      {
        uid: 'smc_roster01',
        studioId: 1n,
        creatorId: 1n,
        defaultRate: null,
        defaultRateType: null,
        defaultCommissionRate: null,
        isActive: true,
        version: 1,
        metadata: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        creator: {
          id: 1n,
          uid: 'mc_creator01',
          name: 'Suvanun',
          aliasName: 'Tong',
          isBanned: false,
          defaultRate: null,
          defaultRateType: null,
          defaultCommissionRate: null,
          type: 'STANDARD' as any,
          metadata: {},
          userId: 10n,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
          user: {
            id: 10n,
            uid: 'user_tong123',
            extId: 'fjkO9i0gvXO43J47rYW0FzWeWcP45JgQ',
            email: 'suvanun.tong1994@gmail.com',
            name: 'ตอง',
            isBanned: false,
            isSystemAdmin: false,
            profileUrl: 'http://example.com/tong.png',
            metadata: {
              email_verified: false,
              role: 'user',
            },
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            deletedAt: null,
          },
        },
      },
    ];

    studioCreatorRepository.findActiveRosterWithUser.mockResolvedValue(mockRosterData as any);

    const result = await controller.getCreatorRoster(studioId);

    expect(studioCreatorRepository.findActiveRosterWithUser).toHaveBeenCalledWith(studioId);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ext_id: 'fjkO9i0gvXO43J47rYW0FzWeWcP45JgQ',
      name: 'ตอง',
      email: 'suvanun.tong1994@gmail.com',
      email_verified: false,
      image: 'http://example.com/tong.png',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      role: 'user',
      banned: false,
      ban_reason: null,
      ban_expires: null,
      mc_name: 'Tong',
      mc_id: 'mc_creator01',
      user_id: 'user_tong123',
    });
  });

  it('should fallback gracefully when creator user linkage is null', async () => {
    const studioId = 'std_OBXMKm0gW4IGQUNQzp4E';
    const mockRosterData = [
      {
        uid: 'smc_roster02',
        studioId: 1n,
        creatorId: 2n,
        isActive: true,
        version: 1,
        metadata: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        creator: {
          id: 2n,
          uid: 'mc_creator02',
          name: 'OnlyCreator',
          aliasName: 'OnlyAlias',
          userId: null,
          user: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        },
      },
    ];

    studioCreatorRepository.findActiveRosterWithUser.mockResolvedValue(mockRosterData as any);

    const result = await controller.getCreatorRoster(studioId);

    expect(studioCreatorRepository.findActiveRosterWithUser).toHaveBeenCalledWith(studioId);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ext_id: null,
      name: 'OnlyCreator',
      email: null,
      email_verified: null,
      image: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      role: null,
      banned: false,
      ban_reason: null,
      ban_expires: null,
      mc_name: 'OnlyAlias',
      mc_id: 'mc_creator02',
      user_id: null,
    });
  });
});
