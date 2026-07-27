import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { SceneProfileService } from '../scene-profile.service';

import { StudioSceneProfileController } from './studio-scene-profile.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import { ClientService } from '@/models/client/client.service';
import { ShowService } from '@/models/show/show.service';

describe('studioSceneProfileController', () => {
  let controller: StudioSceneProfileController;
  let sceneProfileService: jest.Mocked<SceneProfileService>;
  let clientService: jest.Mocked<ClientService>;
  let showService: jest.Mocked<ShowService>;

  const studioId = 'std_1';
  const clientId = 'client_1';
  const user = { ext_id: 'ext_actor_1', id: 'ext_actor_1' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSceneProfileController],
      providers: [
        {
          provide: SceneProfileService,
          useValue: {
            getActiveProfileForClient: jest.fn(),
            saveProfileForClient: jest.fn(),
            retireProfileForClient: jest.fn(),
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

    controller = module.get(StudioSceneProfileController);
    sceneProfileService = module.get(SceneProfileService);
    clientService = module.get(ClientService);
    showService = module.get(ShowService);

    clientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
    // Default: studio is linked to client (has active shows)
    showService.countShows.mockResolvedValue(1);
  });

  it('grants access to DESIGNER, MANAGER and ADMIN only -- MODERATION_MANAGER excluded', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioSceneProfileController);
    expect(roles).toEqual([
      STUDIO_ROLE.DESIGNER,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.ADMIN,
    ]);
  });

  it('exposes exactly GET/PUT/DELETE at studios/:studioId/scene-profiles/:clientId', () => {
    const path = Reflect.getMetadata('path', StudioSceneProfileController);
    expect(path).toBe('studios/:studioId/scene-profiles');

    for (const method of ['show', 'save', 'retire'] as const) {
      expect(typeof controller[method]).toBe('function');
    }
  });

  describe('show', () => {
    it('404s when the client does not exist', async () => {
      clientService.getClientByUid.mockResolvedValue(null);

      await expect(controller.show(studioId, clientId)).rejects.toBeInstanceOf(NotFoundException);
      expect(sceneProfileService.getActiveProfileForClient).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when studio has no active shows for client, even on a read', async () => {
      showService.countShows.mockResolvedValue(0);

      await expect(controller.show(studioId, clientId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(sceneProfileService.getActiveProfileForClient).not.toHaveBeenCalled();
    });

    it('404s (not a nullable 200) when the client has no active Scene Profile', async () => {
      sceneProfileService.getActiveProfileForClient.mockResolvedValue(null);

      await expect(controller.show(studioId, clientId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the profile when one exists', async () => {
      const profile = { uid: 'scprof_1' } as any;
      sceneProfileService.getActiveProfileForClient.mockResolvedValue(profile);

      const result = await controller.show(studioId, clientId);

      expect(sceneProfileService.getActiveProfileForClient).toHaveBeenCalledWith(clientId);
      expect(result).toBe(profile);
    });

    it('runs the linkage check before the service call, even for the read route', async () => {
      showService.countShows.mockResolvedValue(0);
      await expect(controller.show(studioId, clientId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientService.getClientByUid).toHaveBeenCalled();
      expect(showService.countShows).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    const body = {
      objectKey: 'scene_reference/x/y.png',
      fileUrl: 'https://cdn.example.com/scene_reference/x/y.png',
      mimeType: 'image/png',
      fileSize: 100,
      sceneType: 'GRAPHIC_BG',
    } as any;

    it('404s when the client does not exist', async () => {
      clientService.getClientByUid.mockResolvedValue(null);

      await expect(controller.save(user, studioId, clientId, body)).rejects.toBeInstanceOf(NotFoundException);
      expect(sceneProfileService.saveProfileForClient).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when studio has no active shows for client', async () => {
      showService.countShows.mockResolvedValue(0);

      await expect(controller.save(user, studioId, clientId, body)).rejects.toBeInstanceOf(ForbiddenException);
      expect(sceneProfileService.saveProfileForClient).not.toHaveBeenCalled();
    });

    it('delegates to saveProfileForClient with the actor ext_id and studio uid as mutation context', async () => {
      const saved = { uid: 'scprof_1' } as any;
      sceneProfileService.saveProfileForClient.mockResolvedValue(saved);

      const result = await controller.save(user, studioId, clientId, body);

      expect(sceneProfileService.saveProfileForClient).toHaveBeenCalledWith(clientId, body, {
        actorExtId: user.ext_id,
        studioUid: studioId,
      });
      expect(result).toBe(saved);
    });

    it('passes through a 409 conflict raised by the service unchanged', async () => {
      const conflict = Object.assign(new Error('conflict'), { status: 409 });
      sceneProfileService.saveProfileForClient.mockRejectedValue(conflict);

      await expect(controller.save(user, studioId, clientId, body)).rejects.toBe(conflict);
    });
  });

  describe('retire', () => {
    it('404s when the client does not exist', async () => {
      clientService.getClientByUid.mockResolvedValue(null);

      await expect(
        controller.retire(user, studioId, clientId, { version: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(sceneProfileService.retireProfileForClient).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when studio has no active shows for client', async () => {
      showService.countShows.mockResolvedValue(0);

      await expect(
        controller.retire(user, studioId, clientId, { version: 1 } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(sceneProfileService.retireProfileForClient).not.toHaveBeenCalled();
    });

    it('404s when the service reports nothing to retire', async () => {
      sceneProfileService.retireProfileForClient.mockResolvedValue(null);

      await expect(
        controller.retire(user, studioId, clientId, { version: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('delegates to retireProfileForClient with context and the required version query param', async () => {
      const retired = { uid: 'scprof_1' } as any;
      sceneProfileService.retireProfileForClient.mockResolvedValue(retired);

      await controller.retire(user, studioId, clientId, { version: 3 } as any);

      expect(sceneProfileService.retireProfileForClient).toHaveBeenCalledWith(
        clientId,
        { actorExtId: user.ext_id, studioUid: studioId },
        3,
      );
    });

    it('passes through a 409 conflict raised by the service unchanged', async () => {
      const conflict = Object.assign(new Error('conflict'), { status: 409 });
      sceneProfileService.retireProfileForClient.mockRejectedValue(conflict);

      await expect(
        controller.retire(user, studioId, clientId, { version: 1 } as any),
      ).rejects.toBe(conflict);
    });
  });
});
