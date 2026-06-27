import { ConflictException } from '@nestjs/common';

import { clientMechanicCoverageResponseSchema, showMechanicCoverageResponseSchema } from '@eridu/api-types/client-mechanics';

import { ClientMechanicRepository } from './client-mechanic.repository';
import { ClientMechanicService } from './client-mechanic.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import type { UtilityService } from '@/utility/utility.service';

const baseMechanic = {
  id: BigInt(1),
  uid: 'cmech_123',
  client: { uid: 'client_1' },
  title: 'Product mechanic',
  instructionLabel: 'Product mechanic',
  instructionBody: 'Mention the product features',
  status: 'active',
  version: 3,
  contentRevision: 5,
  metadata: {},
};

describe('clientMechanicService', () => {
  let service: ClientMechanicService;
  let repositoryMock: Partial<jest.Mocked<ClientMechanicRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    repositoryMock = createMockRepository<ClientMechanicRepository>({
      findByUidForClient: jest.fn(),
      findPaginated: jest.fn(),
      updateWithVersionCheck: jest.fn(),
      softDelete: jest.fn(),
      findTemplatesByMechanic: jest.fn(),
      findShowsForCoverage: jest.fn(),
      findFinalizedLoopTasksForShows: jest.fn(),
      findTemplateRefsForTemplatesAndSnapshots: jest.fn(),
      findShowForCoverageDetail: jest.fn(),
      findTemplateRefsForShowCoverage: jest.fn(),
    });
    utilityMock = createMockUtilityService('cmech_123');

    const module = await createModelServiceTestModule({
      serviceClass: ClientMechanicService,
      repositoryClass: ClientMechanicRepository,
      repositoryMock,
      utilityMock,
    });

    service = module.get(ClientMechanicService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('createMechanic', () => {
    it('generates a UID and connects the client', async () => {
      (repositoryMock.create as jest.Mock).mockResolvedValue(baseMechanic);

      await service.createMechanic('client_1', { title: 'T', instructionLabel: 'L', instructionBody: 'B' });

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('cmech', undefined);
      const [data] = (repositoryMock.create as jest.Mock).mock.calls[0];
      expect(data).toMatchObject({
        uid: 'cmech_123',
        title: 'T',
        instructionLabel: 'L',
        instructionBody: 'B',
        client: { connect: { uid: 'client_1' } },
      });
    });
  });

  describe('updateMechanic — contentRevision bump', () => {
    it('bumps contentRevision when the instruction body changes', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue(baseMechanic);

      await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { instructionBody: 'New instruction', version: 3 },
      );

      const [, data] = (repositoryMock.updateWithVersionCheck as jest.Mock).mock.calls[0];
      expect(data.contentRevision).toBe(6); // 5 -> 6
      expect(data.version).toBe(4); // 3 -> 4
    });

    it('does NOT bump contentRevision when only the title changes', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue(baseMechanic);

      await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { title: 'Renamed', version: 3 },
      );

      const [, data] = (repositoryMock.updateWithVersionCheck as jest.Mock).mock.calls[0];
      expect(data.contentRevision).toBeUndefined();
      expect(data.version).toBe(4); // version still bumps on any semantic edit
    });

    it('does NOT bump contentRevision when the body is re-submitted unchanged', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);

      const result = await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { instructionBody: baseMechanic.instructionBody, version: 3 },
      );

      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
      expect(result).toBe(baseMechanic);
    });
  });

  describe('updateMechanic — scoping & locking', () => {
    it('does not write or bump version for an empty patch', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);

      const result = await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { version: 3 },
      );

      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
      expect(result).toBe(baseMechanic);
    });

    it('does not write or bump version when all submitted fields are unchanged', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);

      const result = await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        {
          title: baseMechanic.title,
          instructionLabel: baseMechanic.instructionLabel,
          instructionBody: baseMechanic.instructionBody,
          status: baseMechanic.status as 'active',
          version: 3,
        },
      );

      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
      expect(result).toBe(baseMechanic);
    });

    it('returns null for a mechanic not under the client', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      const result = await service.updateMechanic(
        { mechanicUid: 'cmech_x', clientUid: 'client_1' },
        { title: 'T', version: 1 },
      );

      expect(result).toBeNull();
      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('maps a stale version to a 409 conflict', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockRejectedValue(
        new VersionConflictError('stale', 1, 3),
      );

      await expect(
        service.updateMechanic(
          { mechanicUid: 'cmech_123', clientUid: 'client_1' },
          { title: 'T', version: 1 },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('retireMechanic', () => {
    it('sets status to retired and bumps version via the version-guarded update', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue({
        ...baseMechanic,
        status: 'retired',
      });

      const result = await service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' });

      expect(repositoryMock.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'cmech_123', clientUid: 'client_1', version: 3 },
        { status: 'retired', version: 4 },
      );
      expect(result).toMatchObject({ status: 'retired' });
    });

    it('maps a concurrent edit racing the retire to a 409 conflict', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockRejectedValue(
        new VersionConflictError('stale', 3, 4),
      );

      await expect(
        service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('is idempotent for an already-retired mechanic (no write)', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue({
        ...baseMechanic,
        status: 'retired',
      });

      const result = await service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' });

      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: 'retired' });
    });

    it('returns null when the mechanic is not found', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      const result = await service.retireMechanic({ mechanicUid: 'cmech_404', clientUid: 'client_1' });

      expect(result).toBeNull();
      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
    });
  });

  describe('deleteMechanic', () => {
    it('soft-deletes via the version-guarded update and returns the row', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      const deletedAt = new Date();
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue({
        ...baseMechanic,
        deletedAt,
      });

      const result = await service.deleteMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' });

      expect(repositoryMock.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'cmech_123', clientUid: 'client_1', version: 3 },
        { deletedAt: expect.any(Date), version: 4 },
      );
      expect(result!.deletedAt).toBeDefined();
    });

    it('maps a concurrent edit racing the delete to a 409 conflict', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockRejectedValue(
        new VersionConflictError('stale', 3, 4),
      );

      await expect(
        service.deleteMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns null when the mechanic is not found under the client', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      const result = await service.deleteMechanic({ mechanicUid: 'cmech_404', clientUid: 'client_1' });

      expect(result).toBeNull();
      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
    });
  });

  describe('getMechanicCoverage', () => {
    it('throws not found error when the mechanic is missing', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getMechanicCoverage('studio_1', 'client_1', 'cmech_404', new Date(), new Date()),
      ).rejects.toThrow(/Client mechanic not found/);
    });

    it('returns templates and computes is_current across shows', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic); // contentRevision is 5

      // Mock templates referencing it:
      // template_1 has it in latest (snapshotId: null) and snapshot_1 (snapshotId: 10)
      // template_2 has it only in snapshot_2 (snapshotId: 20), but dropped in latest (no null snapshotId row)
      (repositoryMock.findTemplatesByMechanic as jest.Mock).mockResolvedValue([
        {
          templateId: BigInt(1),
          snapshotId: null,
          template: { uid: 'ttpl_1', name: 'Template 1' },
        },
        {
          templateId: BigInt(1),
          snapshotId: BigInt(10),
          template: { uid: 'ttpl_1', name: 'Template 1' },
        },
        {
          templateId: BigInt(2),
          snapshotId: BigInt(20),
          template: { uid: 'ttpl_2', name: 'Template 2' },
        },
      ]);

      // Mock date-ranged shows
      const show1 = { id: BigInt(101), uid: 'show_101', name: 'Show 101', startTime: new Date('2026-06-17T09:00:00Z') };
      const show2 = { id: BigInt(102), uid: 'show_102', name: 'Show 102', startTime: new Date('2026-06-17T10:00:00Z') };
      const show3 = { id: BigInt(103), uid: 'show_103', name: 'Show 103', startTime: new Date('2026-06-17T11:00:00Z') };
      const show4 = { id: BigInt(104), uid: 'show_104', name: 'Show 104', startTime: new Date('2026-06-17T12:00:00Z') };
      const show5 = { id: BigInt(105), uid: 'show_105', name: 'Show 105', startTime: new Date('2026-06-17T13:00:00Z') };
      (repositoryMock.findShowsForCoverage as jest.Mock).mockResolvedValue([show1, show2, show3, show4, show5]);

      // Mock finalized tasks for these shows
      const task1 = {
        uid: 'task_1',
        snapshotId: BigInt(10),
        templateId: BigInt(1),
        targets: [{ showId: BigInt(101) }],
        template: { uid: 'ttpl_1', name: 'Template 1' },
        snapshot: {
          schema: {
            items: [
              {
                mechanic_ref: {
                  mechanic_id: 'cmech_123',
                  content_revision: 5,
                },
              },
            ],
            metadata: { loops: [] },
          },
        },
      };

      const task2 = {
        uid: 'task_2',
        snapshotId: BigInt(11), // different snapshot, referencing old revision
        templateId: BigInt(1),
        targets: [{ showId: BigInt(102) }],
        template: { uid: 'ttpl_1', name: 'Template 1' },
        snapshot: {
          schema: {
            items: [
              {
                mechanic_ref: {
                  mechanic_id: 'cmech_123',
                  content_revision: 4,
                },
              },
            ],
            metadata: { loops: [] },
          },
        },
      };

      const task3 = {
        uid: 'task_3',
        snapshotId: BigInt(12),
        templateId: BigInt(1),
        targets: [{ showId: BigInt(103) }],
        template: { uid: 'ttpl_1', name: 'Template 1' },
        snapshot: {
          schema: {
            items: [], // no mechanic ref at all
            metadata: { loops: [] },
          },
        },
      };

      const task4 = {
        uid: 'task_4',
        snapshotId: BigInt(20),
        templateId: BigInt(2),
        targets: [{ showId: BigInt(104) }],
        template: { uid: 'ttpl_2', name: 'Template 2' },
        snapshot: {
          schema: {
            items: [
              {
                mechanic_ref: {
                  mechanic_id: 'cmech_123',
                  content_revision: 5,
                },
              },
            ],
            metadata: { loops: [] },
          },
        },
      };

      (repositoryMock.findFinalizedLoopTasksForShows as jest.Mock).mockResolvedValue([task1, task2, task3, task4]);

      // Mock template refs query
      (repositoryMock.findTemplateRefsForTemplatesAndSnapshots as jest.Mock).mockResolvedValue([
        // latest template_1 references it
        { templateId: BigInt(1), snapshotId: null, mechanicId: BigInt(1), mechanic: { uid: 'cmech_123', contentRevision: 5 } },
        // snapshot_1 references it
        { templateId: BigInt(1), snapshotId: BigInt(10), mechanicId: BigInt(1), mechanic: { uid: 'cmech_123', contentRevision: 5 } },
        // snapshot_11 references it
        { templateId: BigInt(1), snapshotId: BigInt(11), mechanicId: BigInt(1), mechanic: { uid: 'cmech_123', contentRevision: 4 } },
        // snapshot_20 references it
        { templateId: BigInt(2), snapshotId: BigInt(20), mechanicId: BigInt(1), mechanic: { uid: 'cmech_123', contentRevision: 5 } },
      ]);

      const result = await service.getMechanicCoverage(
        'studio_1',
        'client_1',
        'cmech_123',
        new Date('2026-06-17T00:00:00Z'),
        new Date('2026-06-17T23:59:59Z'),
      );

      // Verify templates list
      expect(result.templates).toEqual(
        expect.arrayContaining([
          { uid: 'ttpl_1', name: 'Template 1', is_latest_carrying: true },
          { uid: 'ttpl_2', name: 'Template 2', is_latest_carrying: false },
        ]),
      );

      // Regression: result must validate against the wire response schema,
      // not just match these field-level assertions -- codex review caught
      // `isLatestCarrying` shipping where `is_latest_carrying` was required.
      expect(() => clientMechanicCoverageResponseSchema.parse(result)).not.toThrow();

      // Verify only shows whose authoritative moderation task includes the mechanic are listed.
      expect(result.shows).toHaveLength(3);

      expect(result.shows[0]).toMatchObject({
        uid: 'show_101',
        is_current: true, // frozen revision (5) matches catalog (5), template still carries it
        task_uid: 'task_1',
        template_uid: 'ttpl_1',
      });

      expect(result.shows[1]).toMatchObject({
        uid: 'show_102',
        is_current: false, // frozen revision (4) behind catalog (5) -- formerly "stale"
        task_uid: 'task_2',
        template_uid: 'ttpl_1',
      });

      expect(result.shows[2]).toMatchObject({
        uid: 'show_104',
        is_current: false, // template_2's latest version no longer carries the mechanic -- formerly "dropped"
        task_uid: 'task_4',
        template_uid: 'ttpl_2',
      });

      expect(result.shows.map((show) => show.uid)).not.toContain('show_103');
      expect(result.shows.map((show) => show.uid)).not.toContain('show_105');
    });

    it('scopes the shows query to the requesting studio, not every studio running the client', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.findTemplatesByMechanic as jest.Mock).mockResolvedValue([]);
      (repositoryMock.findShowsForCoverage as jest.Mock).mockResolvedValue([]);

      await service.getMechanicCoverage(
        'studio_1',
        'client_1',
        'cmech_123',
        new Date('2026-06-17T00:00:00Z'),
        new Date('2026-06-17T23:59:59Z'),
      );

      expect(repositoryMock.findShowsForCoverage).toHaveBeenCalledWith(
        'studio_1',
        'client_1',
        new Date('2026-06-17T00:00:00Z'),
        new Date('2026-06-17T23:59:59Z'),
      );
    });
  });

  describe('getShowMechanicsCoverage', () => {
    it('throws not found when the show is outside the requesting studio', async () => {
      (repositoryMock.findShowForCoverageDetail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getShowMechanicsCoverage('studio_1', 'show_missing'),
      ).rejects.toThrow(/Show not found/);
      expect(repositoryMock.findShowForCoverageDetail).toHaveBeenCalledWith('studio_1', 'show_missing');
    });

    it('returns an empty mechanics list when the show has no finalized loop-bearing task', async () => {
      (repositoryMock.findShowForCoverageDetail as jest.Mock).mockResolvedValue({
        id: BigInt(101),
        uid: 'show_101',
        name: 'Show 101',
        client: { uid: 'client_1', name: 'Acme' },
      });
      (repositoryMock.findFinalizedLoopTasksForShows as jest.Mock).mockResolvedValue([]);

      const result = await service.getShowMechanicsCoverage('studio_1', 'show_101');

      expect(result).toEqual({
        show_uid: 'show_101',
        show_name: 'Show 101',
        client_uid: 'client_1',
        client_name: 'Acme',
        task_uid: null,
        template_uid: null,
        template_name: null,
        mechanics: [],
      });
      expect(repositoryMock.findTemplateRefsForShowCoverage).not.toHaveBeenCalled();

      // Regression: the no-finalized-task branch must still satisfy the
      // required-nullable `task_uid`/`template_uid`/`template_name` fields --
      // codex review caught this branch omitting them entirely.
      expect(() => showMechanicCoverageResponseSchema.parse(result)).not.toThrow();
    });

    it('computes current/stale/missing status per mechanic on the authoritative task', async () => {
      (repositoryMock.findShowForCoverageDetail as jest.Mock).mockResolvedValue({
        id: BigInt(101),
        uid: 'show_101',
        name: 'Show 101',
        client: { uid: 'client_1', name: 'Acme' },
      });

      const task = {
        uid: 'task_1',
        snapshotId: BigInt(10),
        templateId: BigInt(1),
        targets: [{ showId: BigInt(101) }],
        template: { uid: 'ttpl_1', name: 'Template 1' },
        snapshot: {
          schema: {
            items: [
              { mechanic_ref: { mechanic_id: 'cmech_current', content_revision: 5 } },
            ],
            metadata: { loops: [] },
          },
        },
      };
      (repositoryMock.findFinalizedLoopTasksForShows as jest.Mock).mockResolvedValue([task]);

      (repositoryMock.findTemplateRefsForShowCoverage as jest.Mock).mockResolvedValue([
        // current: frozen revision matches catalog revision
        {
          snapshotId: BigInt(10),
          mechanic: {
            uid: 'cmech_current',
            title: 'Current',
            instructionLabel: 'L',
            instructionBody: 'B',
            status: 'active',
            contentRevision: 5,
          },
        },
        // stale: latest-template ref only (no snapshot ref) -> missing on this task's frozen snapshot
        {
          snapshotId: null,
          mechanic: {
            uid: 'cmech_missing',
            title: 'Missing',
            instructionLabel: 'L',
            instructionBody: 'B',
            status: 'active',
            contentRevision: 1,
          },
        },
      ]);

      const result = await service.getShowMechanicsCoverage('studio_1', 'show_101');

      expect(result.task_uid).toBe('task_1');
      expect(result.template_uid).toBe('ttpl_1');
      expect(result.mechanics).toEqual(expect.arrayContaining([
        expect.objectContaining({ uid: 'cmech_current', status: 'current', frozen_revision: 5, catalog_status: 'active' }),
        expect.objectContaining({ uid: 'cmech_missing', status: 'missing', frozen_revision: null, catalog_status: 'active' }),
      ]));
      expect(() => showMechanicCoverageResponseSchema.parse(result)).not.toThrow();
    });

    it('surfaces a retired mechanic via catalog_status', async () => {
      (repositoryMock.findShowForCoverageDetail as jest.Mock).mockResolvedValue({
        id: BigInt(101),
        uid: 'show_101',
        name: 'Show 101',
        client: { uid: 'client_1', name: 'Acme' },
      });

      const task = {
        uid: 'task_1',
        snapshotId: BigInt(10),
        templateId: BigInt(1),
        targets: [{ showId: BigInt(101) }],
        template: { uid: 'ttpl_1', name: 'Template 1' },
        snapshot: {
          schema: {
            items: [
              { mechanic_ref: { mechanic_id: 'cmech_retired', content_revision: 2 } },
            ],
            metadata: { loops: [] },
          },
        },
      };
      (repositoryMock.findFinalizedLoopTasksForShows as jest.Mock).mockResolvedValue([task]);

      (repositoryMock.findTemplateRefsForShowCoverage as jest.Mock).mockResolvedValue([
        {
          snapshotId: BigInt(10),
          mechanic: {
            uid: 'cmech_retired',
            title: 'Retired',
            instructionLabel: 'L',
            instructionBody: 'B',
            status: 'retired',
            contentRevision: 2,
          },
        },
      ]);

      const result = await service.getShowMechanicsCoverage('studio_1', 'show_101');

      expect(result.mechanics).toEqual([
        expect.objectContaining({ uid: 'cmech_retired', status: 'current', catalog_status: 'retired' }),
      ]);
    });
  });
});
