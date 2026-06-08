import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioClientMechanicController } from './studio-client-mechanic.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import { ClientService } from '@/models/client/client.service';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';

describe('studioClientMechanicController', () => {
  let controller: StudioClientMechanicController;
  let mechanicService: jest.Mocked<ClientMechanicService>;
  let clientService: jest.Mocked<ClientService>;

  const studioId = 'std_1';
  const clientId = 'client_1';
  const actor = { ext_id: 'ext_42' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioClientMechanicController],
      providers: [
        {
          provide: ClientMechanicService,
          useValue: {
            listMechanics: jest.fn(),
            getMechanic: jest.fn(),
            createMechanic: jest.fn(),
            updateMechanic: jest.fn(),
            retireMechanic: jest.fn(),
          },
        },
        {
          provide: ClientService,
          useValue: { getClientByUid: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(StudioClientMechanicController);
    mechanicService = module.get(ClientMechanicService);
    clientService = module.get(ClientService);
  });

  it('grants catalog access to ADMIN, MANAGER and ACCOUNT_MANAGER only', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioClientMechanicController);
    expect(roles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.ACCOUNT_MANAGER,
    ]);
  });

  describe('index', () => {
    it('404s when the client does not exist', async () => {
      clientService.getClientByUid.mockResolvedValue(null);

      await expect(
        controller.index(studioId, clientId, { skip: 0, take: 10, sort: 'desc' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mechanicService.listMechanics).not.toHaveBeenCalled();
    });

    it('lists client-scoped mechanics with filters', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mechanicService.listMechanics.mockResolvedValue({ data: [], total: 0 });

      await controller.index(
        studioId,
        clientId,
        { skip: 0, take: 10, sort: 'desc', search: 'promo', status: 'active', page: 1, limit: 10 } as any,
      );

      expect(mechanicService.listMechanics).toHaveBeenCalledWith({
        clientUid: clientId,
        search: 'promo',
        status: 'active',
        skip: 0,
        take: 10,
        sort: 'desc',
      });
    });
  });

  describe('show', () => {
    it('404s when the mechanic is not under the client', async () => {
      mechanicService.getMechanic.mockResolvedValue(null);

      await expect(controller.show(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('validates the client then creates with the current user', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      const created = { uid: 'cmech_1' } as any;
      mechanicService.createMechanic.mockResolvedValue(created);

      const body = { title: 'T', instructionLabel: 'L', instructionBody: 'B' } as any;
      const result = await controller.create(studioId, clientId, body, actor);

      expect(mechanicService.createMechanic).toHaveBeenCalledWith(clientId, body, 'ext_42');
      expect(result).toBe(created);
    });
  });

  describe('update', () => {
    it('404s when the service reports not-found', async () => {
      mechanicService.updateMechanic.mockResolvedValue(null);

      await expect(
        controller.update(studioId, clientId, 'cmech_x', { title: 'T', version: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('retire', () => {
    it('delegates to retireMechanic and returns the row', async () => {
      const retired = { uid: 'cmech_1', status: 'retired' } as any;
      mechanicService.retireMechanic.mockResolvedValue(retired);

      const result = await controller.retire(studioId, clientId, 'cmech_1');

      expect(mechanicService.retireMechanic).toHaveBeenCalledWith({
        mechanicUid: 'cmech_1',
        clientUid: clientId,
      });
      expect(result).toBe(retired);
    });

    it('404s when the mechanic is not found', async () => {
      mechanicService.retireMechanic.mockResolvedValue(null);

      await expect(controller.retire(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
