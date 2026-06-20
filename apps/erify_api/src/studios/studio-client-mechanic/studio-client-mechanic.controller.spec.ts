import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioClientMechanicController } from './studio-client-mechanic.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import { ClientService } from '@/models/client/client.service';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import { ShowService } from '@/models/show/show.service';

describe('studioClientMechanicController', () => {
  let controller: StudioClientMechanicController;
  let mechanicService: jest.Mocked<ClientMechanicService>;
  let clientService: jest.Mocked<ClientService>;
  let showService: jest.Mocked<ShowService>;

  const studioId = 'std_1';
  const clientId = 'client_1';

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
            deleteMechanic: jest.fn(),
          },
        },
        {
          provide: ClientService,
          useValue: { getClientByUid: jest.fn() },
        },
        {
          provide: ShowService,
          useValue: { countShows: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(StudioClientMechanicController);
    mechanicService = module.get(ClientMechanicService);
    clientService = module.get(ClientService);
    showService = module.get(ShowService);

    // Default: studio is linked to client (has active shows)
    showService.countShows.mockResolvedValue(1);
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

    it('throws ForbiddenException when studio has no active shows for client, even on a read', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      showService.countShows.mockResolvedValue(0);

      await expect(
        controller.index(studioId, clientId, { skip: 0, take: 10, sort: 'desc' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
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
    it('404s when the client does not exist', async () => {
      clientService.getClientByUid.mockResolvedValue(null);

      await expect(controller.show(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mechanicService.getMechanic).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when studio has no active shows for client, even on a read', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      showService.countShows.mockResolvedValue(0);

      await expect(controller.show(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mechanicService.getMechanic).not.toHaveBeenCalled();
    });

    it('404s when the mechanic is not under the client', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mechanicService.getMechanic.mockResolvedValue(null);

      await expect(controller.show(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('throws ForbiddenException when studio has no active shows for client', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      showService.countShows.mockResolvedValue(0);

      const body = { title: 'T', instructionLabel: 'L', instructionBody: 'B' } as any;
      await expect(controller.create(studioId, clientId, body)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mechanicService.createMechanic).not.toHaveBeenCalled();
    });

    it('validates the client then creates the mechanic', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      const created = { uid: 'cmech_1' } as any;
      mechanicService.createMechanic.mockResolvedValue(created);

      const body = { title: 'T', instructionLabel: 'L', instructionBody: 'B' } as any;
      const result = await controller.create(studioId, clientId, body);

      expect(mechanicService.createMechanic).toHaveBeenCalledWith(clientId, body);
      expect(result).toBe(created);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when studio has no active shows for client', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      showService.countShows.mockResolvedValue(0);

      await expect(
        controller.update(studioId, clientId, 'cmech_x', { title: 'T', version: 1 } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mechanicService.updateMechanic).not.toHaveBeenCalled();
    });

    it('404s when the service reports not-found', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mechanicService.updateMechanic.mockResolvedValue(null);

      await expect(
        controller.update(studioId, clientId, 'cmech_x', { title: 'T', version: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('restricts hard-delete to ADMIN only, unlike the broader catalog-write guard', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioClientMechanicController.prototype.remove);
      expect(roles).toEqual([STUDIO_ROLE.ADMIN]);
    });

    it('throws ForbiddenException when studio has no active shows for client', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      showService.countShows.mockResolvedValue(0);

      await expect(controller.remove(studioId, clientId, 'cmech_1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mechanicService.deleteMechanic).not.toHaveBeenCalled();
    });

    it('delegates to deleteMechanic and returns the row', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      const deleted = { uid: 'cmech_1', deletedAt: new Date() } as any;
      mechanicService.deleteMechanic.mockResolvedValue(deleted);

      const result = await controller.remove(studioId, clientId, 'cmech_1');

      expect(mechanicService.deleteMechanic).toHaveBeenCalledWith({
        mechanicUid: 'cmech_1',
        clientUid: clientId,
      });
      expect(result).toBe(deleted);
    });

    it('404s when the mechanic is not found', async () => {
      clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mechanicService.deleteMechanic.mockResolvedValue(null);

      await expect(controller.remove(studioId, clientId, 'cmech_x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
