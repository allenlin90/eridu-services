import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import {
  GoogleSheetsCreatorController,
  GoogleSheetsCreatorRosterItemDto,
} from './google-sheets-creator.controller';

import type { StudioCreatorRosterWithUserPayload } from '@/models/studio-creator/studio-creator.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

function buildRosterPayload(
  overrides: Partial<StudioCreatorRosterWithUserPayload> = {},
): StudioCreatorRosterWithUserPayload {
  return {
    extId: 'fjkO9i0gvXO43J47rYW0FzWeWcP45JgQ',
    name: 'ตอง',
    email: 'suvanun.tong1994@gmail.com',
    image: 'http://example.com/tong.png',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    banned: false,
    mcName: 'Tong',
    mcId: 'mc_creator01',
    userId: 'user_tong123',
    ...overrides,
  };
}

describe('googleSheetsCreatorController', () => {
  let controller: GoogleSheetsCreatorController;
  let studioCreatorService: jest.Mocked<StudioCreatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleSheetsCreatorController],
      providers: [
        {
          provide: StudioCreatorService,
          useValue: {
            listActiveRosterWithLinkedUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GoogleSheetsCreatorController>(GoogleSheetsCreatorController);
    studioCreatorService = module.get(StudioCreatorService);
  });

  it('should serialize the roster response as an array', () => {
    const serializerDto = Reflect.getMetadata(
      'ZOD_SERIALIZER_DTO_OPTIONS',
      GoogleSheetsCreatorController.prototype.getCreatorRoster,
    );

    expect(serializerDto).toEqual([GoogleSheetsCreatorRosterItemDto]);
  });

  it('should map the service payload to snake_case sheet columns', async () => {
    const studioId = 'std_OBXMKm0gW4IGQUNQzp4E';
    studioCreatorService.listActiveRosterWithLinkedUsers.mockResolvedValue([
      buildRosterPayload(),
    ]);

    const result = await controller.getCreatorRoster(studioId);

    expect(studioCreatorService.listActiveRosterWithLinkedUsers).toHaveBeenCalledWith(studioId);
    expect(result).toEqual([
      {
        ext_id: 'fjkO9i0gvXO43J47rYW0FzWeWcP45JgQ',
        name: 'ตอง',
        email: 'suvanun.tong1994@gmail.com',
        image: 'http://example.com/tong.png',
        created_at: '2026-01-02T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        banned: false,
        mc_name: 'Tong',
        mc_id: 'mc_creator01',
        user_id: 'user_tong123',
      },
    ]);
  });

  it('should pass through null fields for a creator with no linked user', async () => {
    const studioId = 'std_OBXMKm0gW4IGQUNQzp4E';
    studioCreatorService.listActiveRosterWithLinkedUsers.mockResolvedValue([
      buildRosterPayload({
        extId: null,
        name: 'OnlyCreator',
        email: null,
        image: null,
        userId: null,
        mcName: 'OnlyAlias',
        mcId: 'mc_creator02',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ]);

    const result = await controller.getCreatorRoster(studioId);

    expect(result[0]).toEqual({
      ext_id: null,
      name: 'OnlyCreator',
      email: null,
      image: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      banned: false,
      mc_name: 'OnlyAlias',
      mc_id: 'mc_creator02',
      user_id: null,
    });
  });
});
