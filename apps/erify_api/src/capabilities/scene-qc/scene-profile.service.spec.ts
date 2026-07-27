import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import type { SaveSceneProfilePayload, SceneProfileMutationContext } from './schemas/scene-profile.schema';
import { sceneProfileDefaultInclude } from './schemas/scene-profile.schema';
import { SceneProfileService } from './scene-profile.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';

import { StorageService } from '@/lib/storage/storage.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

function createSceneProfileDelegateMock() {
  return {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

function createSceneProfileRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    uid: 'scprof_test123',
    clientId: 10n,
    client: { uid: 'client_abc' },
    objectKey: 'scene_reference/client_abc/2026-01-01/deadbeef-reference.png',
    fileUrl: 'https://cdn.example.com/scene_reference/client_abc/2026-01-01/deadbeef-reference.png',
    mimeType: 'image/png',
    fileSize: 12345,
    sceneType: 'GRAPHIC_BG',
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function createUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.0.0',
  });
}

function createRecordNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError('Record to update not found', {
    code: 'P2025',
    clientVersion: '7.0.0',
  });
}

// The actor segment ("ext_actor_1") must match CONTEXT.actorExtId below —
// the service now verifies a saved object_key was actually issued to the
// current actor.
const SAVE_PAYLOAD: SaveSceneProfilePayload = {
  objectKey: 'scene_reference/ext_actor_1/2026-01-01/deadbeef-reference.png',
  fileUrl: 'https://cdn.example.com/scene_reference/ext_actor_1/2026-01-01/deadbeef-reference.png',
  mimeType: 'image/png',
  fileSize: 12345,
  sceneType: 'GRAPHIC_BG',
};

const CONTEXT: SceneProfileMutationContext = { actorExtId: 'ext_actor_1', studioUid: 'studio_abc' };
const ACTOR = { id: 99n, uid: 'user_actor1' };

// The `$transaction` mock passes ITSELF as the tx client, so `TransactionHost.tx`
// resolves to the same delegate objects whether or not a `@Transactional()`
// method is currently active (see TransactionalAdapterPrisma.getFallbackInstance
// vs wrapWithTransaction — both end up pointing at this object).
let mockPrismaForCls: {
  sceneProfile: ReturnType<typeof createSceneProfileDelegateMock>;
  audit: { create: jest.Mock };
  $transaction: jest.Mock;
};

@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('sceneProfileService', () => {
  let service: SceneProfileService;
  let delegate: ReturnType<typeof createSceneProfileDelegateMock>;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;
  let storageService: jest.Mocked<Pick<StorageService, 'resolvePublicFileUrl' | 'sanitizeActorIdForObjectKey' | 'headObject'>>;
  let userService: jest.Mocked<Pick<UserService, 'getUserByExtId'>>;
  let auditWriter: jest.Mocked<Pick<SceneQcAuditWriter, 'recordSceneProfileChange'>>;

  beforeEach(async () => {
    delegate = createSceneProfileDelegateMock();
    mockPrismaForCls = {
      sceneProfile: delegate,
      audit: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(mockPrismaForCls)),
    };

    uidGenerator = {
      generateBrandedId: jest.fn().mockReturnValue('scprof_test123'),
    };
    storageService = {
      resolvePublicFileUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
      // Identity sanitization for the clean ext-id fixtures used in this file
      // — StorageService.sanitizeActorIdForObjectKey's own transform rules
      // are covered in storage.service.spec.ts.
      sanitizeActorIdForObjectKey: jest.fn((actorId: string) => actorId),
      // Default "happy path": the R2-observed content matches what the
      // fixtures claim, so existing assertions against SAVE_PAYLOAD's
      // mime_type/file_size continue to hold for the server-verified values.
      headObject: jest.fn().mockResolvedValue({ contentType: 'image/png', contentLength: 12345 }),
    };
    userService = {
      getUserByExtId: jest.fn().mockResolvedValue({ id: ACTOR.id, uid: ACTOR.uid }),
    };
    auditWriter = {
      recordSceneProfileChange: jest.fn().mockResolvedValue({ uid: 'aud_test1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
              imports: [MockPrismaModule],
            }),
          ],
        }),
      ],
      providers: [
        SceneProfileService,
        { provide: UidGeneratorService, useValue: uidGenerator },
        { provide: StorageService, useValue: storageService },
        { provide: UserService, useValue: userService },
        { provide: SceneQcAuditWriter, useValue: auditWriter },
      ],
    })
      // Override the real PrismaService provider registered by MockPrismaModule
      // with the mock object that also serves as the tx client.
      .overrideProvider(PrismaService)
      .useValue(mockPrismaForCls)
      .compile();

    service = module.get(SceneProfileService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveProfileForClient', () => {
    it('scopes by client uid and non-deleted rows, applying the default include', async () => {
      const expected = createSceneProfileRecord();
      delegate.findFirst.mockResolvedValue(expected);

      await expect(
        service.getActiveProfileForClient('client_abc'),
      ).resolves.toEqual(expected);

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: {
          client: { uid: 'client_abc', deletedAt: null },
          deletedAt: null,
        },
        include: sceneProfileDefaultInclude,
      });
    });

    it('returns null (never throws) when no profile exists', async () => {
      delegate.findFirst.mockResolvedValue(null);

      await expect(
        service.getActiveProfileForClient('client_abc'),
      ).resolves.toBeNull();
    });
  });

  describe('saveProfileForClient — actor and upload-policy guards', () => {
    it('rejects with 401 and never touches persistence when the actor is unknown', async () => {
      userService.getUserByExtId.mockResolvedValue(null);

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({ status: 401 });

      expect(delegate.findFirst).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('rejects with 400 and writes no audit when object_key is outside the scene_reference namespace', async () => {
      await expect(
        service.saveProfileForClient(
          'client_abc',
          { ...SAVE_PAYLOAD, objectKey: 'qc_screenshot/client_abc/x.png' },
          CONTEXT,
        ),
      ).rejects.toMatchObject({ status: 400 });

      expect(delegate.create).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('rejects with 400 and writes no audit when file_url does not match the derived public URL for object_key', async () => {
      await expect(
        service.saveProfileForClient(
          'client_abc',
          { ...SAVE_PAYLOAD, fileUrl: 'https://evil.example.com/steal.png' },
          CONTEXT,
        ),
      ).rejects.toMatchObject({ status: 400 });

      expect(delegate.create).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
      expect(storageService.headObject).not.toHaveBeenCalled();
    });

    it('rejects with 403 and writes no audit when object_key was not issued to the current actor', async () => {
      await expect(
        service.saveProfileForClient(
          'client_abc',
          {
            ...SAVE_PAYLOAD,
            objectKey: 'scene_reference/ext_someone_else/2026-01-01/deadbeef-reference.png',
            fileUrl: 'https://cdn.example.com/scene_reference/ext_someone_else/2026-01-01/deadbeef-reference.png',
          },
          CONTEXT,
        ),
      ).rejects.toMatchObject({ status: 403 });

      expect(delegate.create).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
      expect(storageService.headObject).not.toHaveBeenCalled();
    });

    it('rejects with 400 and writes no audit when the object does not actually exist in storage', async () => {
      storageService.headObject.mockResolvedValueOnce(null);

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({ message: expect.stringContaining('could not be found') }),
      });

      expect(delegate.create).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the R2-observed content type is not an accepted image type, regardless of the claimed mime_type', async () => {
      storageService.headObject.mockResolvedValueOnce({ contentType: 'application/pdf', contentLength: 12345 });

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({ message: expect.stringContaining('accepted image types') }),
      });

      expect(delegate.create).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the R2-observed size is zero or negative', async () => {
      storageService.headObject.mockResolvedValueOnce({ contentType: 'image/png', contentLength: 0 });

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({ status: 400 });

      expect(delegate.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the R2-observed size exceeds the accepted ceiling', async () => {
      storageService.headObject.mockResolvedValueOnce({ contentType: 'image/png', contentLength: 999_999_999 });

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({ status: 400 });

      expect(delegate.create).not.toHaveBeenCalled();
    });

    it('persists the R2-observed mime_type/file_size, not the caller-claimed values, when they differ', async () => {
      delegate.findFirst.mockResolvedValue(null);
      storageService.headObject.mockResolvedValueOnce({ contentType: 'image/webp', contentLength: 999 });
      const created = createSceneProfileRecord({ mimeType: 'image/webp', fileSize: 999 });
      delegate.create.mockResolvedValue(created);

      await service.saveProfileForClient(
        'client_abc',
        { ...SAVE_PAYLOAD, mimeType: 'image/png', fileSize: 12345 },
        CONTEXT,
      );

      expect(delegate.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ mimeType: 'image/webp', fileSize: 999 }),
      }));
    });
  });

  describe('saveProfileForClient — create path', () => {
    it('generates a scprof-prefixed uid, creates with exactly the right fields, and records a CREATE audit', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const created = createSceneProfileRecord();
      delegate.create.mockResolvedValue(created);

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).resolves.toEqual(created);

      expect(uidGenerator.generateBrandedId).toHaveBeenCalledWith('scprof', undefined);
      expect(delegate.create).toHaveBeenCalledWith({
        data: {
          uid: 'scprof_test123',
          objectKey: SAVE_PAYLOAD.objectKey,
          fileUrl: SAVE_PAYLOAD.fileUrl,
          mimeType: SAVE_PAYLOAD.mimeType,
          fileSize: SAVE_PAYLOAD.fileSize,
          sceneType: SAVE_PAYLOAD.sceneType,
          client: { connect: { uid: 'client_abc' } },
        },
        include: sceneProfileDefaultInclude,
      });
      const createArgs = delegate.create.mock.calls[0][0];
      expect(createArgs.data).not.toHaveProperty('version');

      expect(auditWriter.recordSceneProfileChange).toHaveBeenCalledWith({
        action: 'CREATE',
        actorId: ACTOR.id,
        sceneProfileId: created.id,
        metadata: expect.objectContaining({
          event: 'scene_profile_saved',
          scene_profile_uid: created.uid,
          client_uid: 'client_abc',
          studio_uid: CONTEXT.studioUid,
          actor_uid: ACTOR.uid,
          old_value: null,
          new_value: { object_key: created.objectKey, scene_type: created.sceneType },
        }),
      });
    });

    it('maps a unique-constraint error on create to 409 and writes no audit — the real concurrency guard', async () => {
      delegate.findFirst.mockResolvedValue(null);
      delegate.create.mockRejectedValue(createUniqueConstraintError());

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({ status: 409 });
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('rejects with 409 and never calls create when version is supplied but no profile exists', async () => {
      delegate.findFirst.mockResolvedValue(null);

      await expect(
        service.saveProfileForClient('client_abc', { ...SAVE_PAYLOAD, version: 1 }, CONTEXT),
      ).rejects.toMatchObject({ status: 409 });

      expect(delegate.create).not.toHaveBeenCalled();
    });
  });

  describe('saveProfileForClient — replace path', () => {
    it('rejects with 409 and never calls update when no version is supplied but a profile already exists', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord());

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD, CONTEXT),
      ).rejects.toMatchObject({ status: 409 });

      expect(delegate.update).not.toHaveBeenCalled();
    });

    it('sends the exact version-guarded where-clause, an atomic increment, and records an UPDATE audit with old+new values', async () => {
      const existing = createSceneProfileRecord({ version: 5 });
      delegate.findFirst.mockResolvedValue(existing);
      const replaced = createSceneProfileRecord({ version: 6, objectKey: 'scene_reference/ext_actor_1/2026-01-02/newfile.png', fileUrl: 'https://cdn.example.com/scene_reference/ext_actor_1/2026-01-02/newfile.png' });
      delegate.update.mockResolvedValue(replaced);

      const payload = {
        ...SAVE_PAYLOAD,
        objectKey: 'scene_reference/ext_actor_1/2026-01-02/newfile.png',
        fileUrl: 'https://cdn.example.com/scene_reference/ext_actor_1/2026-01-02/newfile.png',
        version: 3,
      };

      await expect(
        service.saveProfileForClient('client_abc', payload, CONTEXT),
      ).resolves.toEqual(replaced);

      // The CLIENT-supplied version (3) is used in the where-clause, not the
      // just-read existing.version (5) — the service never "helpfully"
      // substitutes a corrected value.
      expect(delegate.update).toHaveBeenCalledWith({
        where: {
          uid: existing.uid,
          version: 3,
          deletedAt: null,
          client: { uid: 'client_abc', deletedAt: null },
        },
        data: {
          objectKey: payload.objectKey,
          fileUrl: payload.fileUrl,
          mimeType: payload.mimeType,
          fileSize: payload.fileSize,
          sceneType: payload.sceneType,
          version: { increment: 1 },
        },
        include: sceneProfileDefaultInclude,
      });

      expect(auditWriter.recordSceneProfileChange).toHaveBeenCalledWith({
        action: 'UPDATE',
        actorId: ACTOR.id,
        sceneProfileId: replaced.id,
        metadata: expect.objectContaining({
          old_value: { object_key: existing.objectKey, scene_type: existing.sceneType },
          new_value: { object_key: replaced.objectKey, scene_type: replaced.sceneType },
        }),
      });
    });

    it('maps a record-not-found error on replace to 409 with a refresh message and writes no audit', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord({ version: 5 }));
      delegate.update.mockRejectedValue(createRecordNotFoundError());

      await expect(
        service.saveProfileForClient('client_abc', { ...SAVE_PAYLOAD, version: 5 }, CONTEXT),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          message: expect.stringContaining('out of date'),
        }),
      });
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });
  });

  describe('retireProfileForClient', () => {
    it('returns null and never calls update when nothing exists to retire', async () => {
      delegate.findFirst.mockResolvedValue(null);

      await expect(
        service.retireProfileForClient('client_abc', CONTEXT, 1),
      ).resolves.toBeNull();
      expect(delegate.update).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('sets deletedAt, leaves version untouched in the data payload, and records a DELETE audit', async () => {
      const existing = createSceneProfileRecord({ version: 2 });
      delegate.findFirst.mockResolvedValue(existing);
      const retired = createSceneProfileRecord({ version: 2, deletedAt: new Date() });
      delegate.update.mockResolvedValue(retired);

      await expect(
        service.retireProfileForClient('client_abc', CONTEXT, 2),
      ).resolves.toEqual(retired);

      expect(delegate.update).toHaveBeenCalledWith({
        where: {
          uid: existing.uid,
          version: 2,
          deletedAt: null,
          client: { uid: 'client_abc', deletedAt: null },
        },
        data: { deletedAt: expect.any(Date) },
        include: sceneProfileDefaultInclude,
      });
      const updateArgs = delegate.update.mock.calls[0][0];
      expect(updateArgs.data).not.toHaveProperty('version');

      expect(auditWriter.recordSceneProfileChange).toHaveBeenCalledWith({
        action: 'DELETE',
        actorId: ACTOR.id,
        sceneProfileId: retired.id,
        metadata: expect.objectContaining({
          event: 'scene_profile_retired',
          old_value: { object_key: existing.objectKey, scene_type: existing.sceneType },
          new_value: null,
        }),
      });
    });

    it('rejects with 409 and writes no audit when the caller-supplied expectedVersion is stale', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord({ version: 5 }));

      await expect(
        service.retireProfileForClient('client_abc', CONTEXT, 4),
      ).rejects.toMatchObject({ status: 409 });
      expect(delegate.update).not.toHaveBeenCalled();
      expect(auditWriter.recordSceneProfileChange).not.toHaveBeenCalled();
    });

    it('maps a record-not-found error on retire to 409', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord({ version: 2 }));
      delegate.update.mockRejectedValue(createRecordNotFoundError());

      await expect(
        service.retireProfileForClient('client_abc', CONTEXT, 2),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  it('rejects a raw Prisma input type at the payload boundary', () => {
    // Prisma.SceneProfileUpdateInput's scalar fields are optional and wrapped
    // in *FieldUpdateOperationsInput unions (e.g. `objectKey?: string |
    // StringFieldUpdateOperationsInput`) — structurally incompatible with
    // SaveSceneProfilePayload's required plain-string/number fields. This
    // proves the public payload type, not a raw Prisma input type, is what
    // callers must supply.
    // @ts-expect-error — SaveSceneProfilePayload must not accept Prisma.SceneProfileUpdateInput.
    const payload: SaveSceneProfilePayload = {} as Prisma.SceneProfileUpdateInput;
    expect(payload).toBeDefined();
  });
});
