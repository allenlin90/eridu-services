import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import type { SaveSceneProfilePayload } from './schemas/scene-profile.schema';
import { sceneProfileDefaultInclude } from './schemas/scene-profile.schema';
import { SceneProfileService } from './scene-profile.service';

import type { UidGeneratorService } from '@/lib/uid/uid-generator.service';

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
    objectKey: 'scene-profiles/client_abc/reference.png',
    fileUrl: 'https://cdn.example.com/scene-profiles/client_abc/reference.png',
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

const SAVE_PAYLOAD: SaveSceneProfilePayload = {
  objectKey: 'scene-profiles/client_abc/reference.png',
  fileUrl: 'https://cdn.example.com/scene-profiles/client_abc/reference.png',
  mimeType: 'image/png',
  fileSize: 12345,
  sceneType: 'GRAPHIC_BG',
};

describe('sceneProfileService', () => {
  let service: SceneProfileService;
  let delegate: ReturnType<typeof createSceneProfileDelegateMock>;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;

  beforeEach(() => {
    delegate = createSceneProfileDelegateMock();
    uidGenerator = {
      generateBrandedId: jest.fn().mockReturnValue('scprof_test123'),
    };
    const txHost = {
      tx: { sceneProfile: delegate },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;

    service = new SceneProfileService(
      txHost,
      uidGenerator as unknown as UidGeneratorService,
    );
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

  describe('saveProfileForClient — create path', () => {
    it('generates a scprof-prefixed uid and creates with exactly the right fields, without setting version explicitly', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const created = createSceneProfileRecord();
      delegate.create.mockResolvedValue(created);

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD),
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
    });

    it('maps a unique-constraint error on create to 409 — the real concurrency guard', async () => {
      delegate.findFirst.mockResolvedValue(null);
      delegate.create.mockRejectedValue(createUniqueConstraintError());

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rejects with 409 and never calls create when version is supplied but no profile exists', async () => {
      delegate.findFirst.mockResolvedValue(null);

      await expect(
        service.saveProfileForClient('client_abc', { ...SAVE_PAYLOAD, version: 1 }),
      ).rejects.toMatchObject({ status: 409 });

      expect(delegate.create).not.toHaveBeenCalled();
    });
  });

  describe('saveProfileForClient — replace path', () => {
    it('rejects with 409 and never calls update when no version is supplied but a profile already exists', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord());

      await expect(
        service.saveProfileForClient('client_abc', SAVE_PAYLOAD),
      ).rejects.toMatchObject({ status: 409 });

      expect(delegate.update).not.toHaveBeenCalled();
    });

    it('sends the exact version-guarded where-clause and an atomic increment, using the client-supplied version', async () => {
      const existing = createSceneProfileRecord({ version: 5 });
      delegate.findFirst.mockResolvedValue(existing);
      const replaced = createSceneProfileRecord({ version: 6 });
      delegate.update.mockResolvedValue(replaced);

      await expect(
        service.saveProfileForClient('client_abc', { ...SAVE_PAYLOAD, version: 3 }),
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
          objectKey: SAVE_PAYLOAD.objectKey,
          fileUrl: SAVE_PAYLOAD.fileUrl,
          mimeType: SAVE_PAYLOAD.mimeType,
          fileSize: SAVE_PAYLOAD.fileSize,
          sceneType: SAVE_PAYLOAD.sceneType,
          version: { increment: 1 },
        },
        include: sceneProfileDefaultInclude,
      });
    });

    it('maps a record-not-found error on replace to 409 with a refresh message', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord({ version: 5 }));
      delegate.update.mockRejectedValue(createRecordNotFoundError());

      await expect(
        service.saveProfileForClient('client_abc', { ...SAVE_PAYLOAD, version: 5 }),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          message: expect.stringContaining('out of date'),
        }),
      });
    });
  });

  describe('retireProfileForClient', () => {
    it('returns null and never calls update when nothing exists to retire', async () => {
      delegate.findFirst.mockResolvedValue(null);

      await expect(
        service.retireProfileForClient('client_abc'),
      ).resolves.toBeNull();
      expect(delegate.update).not.toHaveBeenCalled();
    });

    it('sets deletedAt and leaves version untouched in the data payload, guarded by the just-read version', async () => {
      const existing = createSceneProfileRecord({ version: 2 });
      delegate.findFirst.mockResolvedValue(existing);
      const retired = createSceneProfileRecord({ version: 2, deletedAt: new Date() });
      delegate.update.mockResolvedValue(retired);

      await expect(
        service.retireProfileForClient('client_abc'),
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
    });

    it('maps a record-not-found error on retire to 409', async () => {
      delegate.findFirst.mockResolvedValue(createSceneProfileRecord({ version: 2 }));
      delegate.update.mockRejectedValue(createRecordNotFoundError());

      await expect(
        service.retireProfileForClient('client_abc'),
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
