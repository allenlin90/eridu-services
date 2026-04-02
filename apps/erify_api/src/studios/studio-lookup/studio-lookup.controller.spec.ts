import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioLookupController } from './studio-lookup.controller';

import { ClientService } from '@/models/client/client.service';
import { PlatformService } from '@/models/platform/platform.service';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

describe('studioLookupController', () => {
  let controller: StudioLookupController;
  let clientService: jest.Mocked<ClientService>;
  let showTypeService: jest.Mocked<ShowTypeService>;
  let showStandardService: jest.Mocked<ShowStandardService>;
  let showStatusService: jest.Mocked<ShowStatusService>;
  let platformService: jest.Mocked<PlatformService>;
  let studioRoomService: jest.Mocked<StudioRoomService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioLookupController],
      providers: [
        {
          provide: ClientService,
          useValue: { listClients: jest.fn() },
        },
        {
          provide: ShowTypeService,
          useValue: { listShowTypes: jest.fn() },
        },
        {
          provide: ShowStandardService,
          useValue: { listShowStandards: jest.fn() },
        },
        {
          provide: ShowStatusService,
          useValue: { getShowStatuses: jest.fn() },
        },
        {
          provide: PlatformService,
          useValue: { listPlatforms: jest.fn() },
        },
        {
          provide: StudioRoomService,
          useValue: { getStudioRooms: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<StudioLookupController>(StudioLookupController);
    clientService = module.get(ClientService);
    showTypeService = module.get(ShowTypeService);
    showStandardService = module.get(ShowStandardService);
    showStatusService = module.get(ShowStatusService);
    platformService = module.get(PlatformService);
    studioRoomService = module.get(StudioRoomService);
  });

  it('should return the studio show lookup bundle with clients and studio rooms', async () => {
    clientService.listClients.mockResolvedValue({ data: [], total: 0 } as any);
    showTypeService.listShowTypes.mockResolvedValue({ data: [], total: 0 } as any);
    showStandardService.listShowStandards.mockResolvedValue({ data: [], total: 0 } as any);
    showStatusService.getShowStatuses.mockResolvedValue({ data: [], total: 0 } as any);
    platformService.listPlatforms.mockResolvedValue({ data: [], total: 0 } as any);
    studioRoomService.getStudioRooms.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getShowLookups('std_1');

    expect(clientService.listClients).toHaveBeenCalledWith({
      take: 200,
      include_deleted: false,
    });
    expect(studioRoomService.getStudioRooms).toHaveBeenCalledWith({
      take: 200,
      includeDeleted: false,
      studioUid: 'std_1',
    });
  });

  it('should list studio show types', async () => {
    showTypeService.listShowTypes.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getShowTypes('std_1', {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
      name: undefined,
      include_deleted: false,
      uid: undefined,
    } as any);

    expect(showTypeService.listShowTypes).toHaveBeenCalled();
  });

  it('should list studio clients', async () => {
    clientService.listClients.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getClients('std_1', {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
      name: undefined,
      include_deleted: false,
      uid: undefined,
    } as any);

    expect(clientService.listClients).toHaveBeenCalled();
  });

  it('should list studio show standards', async () => {
    showStandardService.listShowStandards.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getShowStandards('std_1', {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
      name: undefined,
      include_deleted: false,
      uid: undefined,
    } as any);

    expect(showStandardService.listShowStandards).toHaveBeenCalled();
  });

  it('should list studio show statuses', async () => {
    showStatusService.getShowStatuses.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getShowStatuses('std_1', {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
    } as any);

    expect(showStatusService.getShowStatuses).toHaveBeenCalledWith({
      skip: 0,
      take: 100,
    });
  });

  it('should list studio platforms', async () => {
    platformService.listPlatforms.mockResolvedValue({ data: [], total: 0 } as any);

    await controller.getPlatforms('std_1', {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
      name: undefined,
      includeDeleted: false,
      uid: undefined,
    } as any);

    expect(platformService.listPlatforms).toHaveBeenCalled();
  });
});
