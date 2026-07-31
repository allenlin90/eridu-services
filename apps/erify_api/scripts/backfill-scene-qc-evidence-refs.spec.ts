import {
  ensureLocalDatabase,
  findCandidateEvidenceFields,
  hasUnresolvedOrFailedBindings,
  runBackfill,
} from './backfill-scene-qc-evidence-refs';
import type { SceneQcEvidenceBinding } from './scene-qc-evidence-binding-map';

function v1Template(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    uid: 'ttpl_1',
    name: 'BAU Moderator Workflow',
    version: 1,
    deletedAt: null,
    client: { uid: 'client_1' },
    studio: { uid: 'studio_1' },
    currentSchema: {
      items: [
        { id: 'a', key: 'scene_photo', type: 'file', label: 'Scene photo', validation: { accept: 'image/*' } },
        { id: 'b', key: 'notes', type: 'text', label: 'Notes' },
      ],
    },
    ...overrides,
  };
}

describe('backfill-scene-qc-evidence-refs script', () => {
  describe('ensureLocalDatabase', () => {
    it('allows a localhost DATABASE_URL', () => {
      expect(() => ensureLocalDatabase('postgresql://x@localhost:5432/db', undefined)).not.toThrow();
    });

    it('refuses a non-local DATABASE_URL without ALLOW_PROD', () => {
      expect(() => ensureLocalDatabase('postgresql://x@prod.example.com:5432/db', undefined)).toThrow();
    });

    it('allows a non-local DATABASE_URL when ALLOW_PROD=1', () => {
      expect(() => ensureLocalDatabase('postgresql://x@prod.example.com:5432/db', '1')).not.toThrow();
    });
  });

  describe('findCandidateEvidenceFields', () => {
    it('lists an image-only file field with no evidence_purpose yet', async () => {
      const prisma: any = {
        taskTemplate: { findMany: jest.fn().mockResolvedValue([v1Template()]) },
        task: { count: jest.fn().mockResolvedValue(3) },
      };

      const rows = await findCandidateEvidenceFields(prisma);

      expect(rows).toEqual([
        { templateUid: 'ttpl_1', templateName: 'BAU Moderator Workflow', version: 1, engine: 'task_template_v1', fieldKey: 'scene_photo', label: 'Scene photo', taskCount: 3 },
      ]);
    });

    it('excludes a field that already carries evidence_purpose', async () => {
      const template = v1Template({
        currentSchema: {
          items: [
            { id: 'a', key: 'scene_photo', type: 'file', label: 'Scene photo', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } },
          ],
        },
      });
      const prisma: any = {
        taskTemplate: { findMany: jest.fn().mockResolvedValue([template]) },
        task: { count: jest.fn() },
      };

      const rows = await findCandidateEvidenceFields(prisma);
      expect(rows).toEqual([]);
    });

    it('excludes a file field whose accept rule is not image-only', async () => {
      const template = v1Template({
        currentSchema: {
          items: [
            { id: 'a', key: 'attachment', type: 'file', label: 'Attachment', validation: { accept: 'image/*,.pdf' } },
          ],
        },
      });
      const prisma: any = {
        taskTemplate: { findMany: jest.fn().mockResolvedValue([template]) },
        task: { count: jest.fn() },
      };

      const rows = await findCandidateEvidenceFields(prisma);
      expect(rows).toEqual([]);
    });
  });

  describe('runBackfill', () => {
    function makePrisma(overrides: Record<string, any> = {}) {
      return {
        taskTemplate: { findFirst: jest.fn().mockResolvedValue(v1Template()) },
        taskTemplateSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
        taskTemplateSceneQcEvidenceRef: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        ...overrides,
      };
    }

    const bindings: SceneQcEvidenceBinding[] = [
      { templateUid: 'ttpl_1', fieldKeys: ['scene_photo'], note: 'reviewed by QA' },
    ];

    it('is a dry-run by default: reports what it would do without calling updateTemplateWithSnapshot', async () => {
      const prisma = makePrisma();
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn() };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: false });

      expect(taskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
      expect(result.templatesProcessed).toBe(1);
      expect(result.snapshotsBound).toBe(1);
      expect(result.templatesAlreadyMarked).toBe(0);
    });

    it('in --apply mode, marks the field and writes through updateTemplateWithSnapshot', async () => {
      const prisma = makePrisma();
      const taskTemplateService = {
        updateTemplateWithSnapshot: jest.fn().mockResolvedValue({ uid: 'ttpl_1', version: 2 }),
      };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      expect(taskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        'ttpl_1',
        'studio_1',
        expect.objectContaining({
          version: 1,
          clientUid: 'client_1',
          currentSchema: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ key: 'scene_photo', evidence_purpose: 'scene_qc' }),
            ]),
          }),
        }),
      );
      expect(result.snapshotsBound).toBe(1);
    });

    it('is idempotent: reports already_marked and skips the version bump when the marker is already present', async () => {
      const alreadyMarkedTemplate = v1Template({
        currentSchema: {
          items: [
            { id: 'a', key: 'scene_photo', type: 'file', label: 'Scene photo', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } },
          ],
        },
      });
      const prisma = makePrisma({
        taskTemplate: { findFirst: jest.fn().mockResolvedValue(alreadyMarkedTemplate) },
      });
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn() };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      expect(taskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
      expect(result.templatesAlreadyMarked).toBe(1);
    });

    it('replaying --apply a second time does not error and remains idempotent', async () => {
      const prisma = makePrisma();
      const taskTemplateService = {
        updateTemplateWithSnapshot: jest.fn().mockResolvedValue({ uid: 'ttpl_1', version: 2 }),
      };

      await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      // Second run: schema now already carries the marker (as updateTemplateWithSnapshot would persist).
      prisma.taskTemplate.findFirst.mockResolvedValue(v1Template({
        version: 2,
        currentSchema: {
          items: [
            { id: 'a', key: 'scene_photo', type: 'file', label: 'Scene photo', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } },
          ],
        },
      }));
      const secondResult = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      expect(secondResult.templatesAlreadyMarked).toBe(1);
      expect(taskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledTimes(1);
    });

    it('reports an unresolved field key and skips it rather than crashing when it is absent from the current schema', async () => {
      const prisma = makePrisma();
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn().mockResolvedValue({}) };
      const missingKeyBindings: SceneQcEvidenceBinding[] = [
        { templateUid: 'ttpl_1', fieldKeys: ['scene_photo', 'does_not_exist'], note: 'x' },
      ];

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings: missingKeyBindings, apply: false });

      expect(result.unresolvedFieldKeys).toEqual([{ templateUid: 'ttpl_1', fieldKey: 'does_not_exist' }]);
    });

    it('fails closed in --apply mode: aborts the current-snapshot write entirely when any mapped field key is unresolved, rather than partially applying the resolved ones', async () => {
      const prisma = makePrisma();
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn().mockResolvedValue({}) };
      const missingKeyBindings: SceneQcEvidenceBinding[] = [
        { templateUid: 'ttpl_1', fieldKeys: ['scene_photo', 'does_not_exist'], note: 'x' },
      ];

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings: missingKeyBindings, apply: true });

      // The resolved field ("scene_photo") must NOT get silently marked while
      // "does_not_exist" is dropped -- a template with a partially-resolved
      // mapping is a failure, not a bind.
      expect(taskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
      expect(result.snapshotsBound).toBe(0);
      expect(result.templatesFailed).toBe(1);
      expect(result.unresolvedFieldKeys).toEqual([{ templateUid: 'ttpl_1', fieldKey: 'does_not_exist' }]);
    });

    it('still runs the historical pass for a template whose current-snapshot pass was aborted for unresolved keys', async () => {
      const historicalSnapshot = {
        id: 99n,
        version: 1,
        schema: {
          items: [
            { id: 'a', key: 'scene_photo', type: 'file', label: 'Old label', validation: { accept: 'image/*' } },
          ],
        },
      };
      const prisma = makePrisma({
        taskTemplateSnapshot: { findMany: jest.fn().mockResolvedValue([historicalSnapshot]) },
        taskTemplateSceneQcEvidenceRef: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      });
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn() };
      const missingKeyBindings: SceneQcEvidenceBinding[] = [
        { templateUid: 'ttpl_1', fieldKeys: ['scene_photo', 'does_not_exist'], note: 'x' },
      ];

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings: missingKeyBindings, apply: true });

      expect(taskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
      expect(result.templatesFailed).toBe(1);
      // The historical (past-snapshot) pass is independent of the aborted
      // current-snapshot pass and still binds what it can resolve.
      expect(prisma.taskTemplateSceneQcEvidenceRef.createMany).toHaveBeenCalledWith({
        data: [{ templateId: 1n, snapshotId: 99n, fieldKey: 'scene_photo', label: 'Old label' }],
        skipDuplicates: true,
      });
      expect(result.rowsCreated).toBe(1);
    });

    it('reports an unresolved map entry when the template no longer exists', async () => {
      const prisma = makePrisma({ taskTemplate: { findFirst: jest.fn().mockResolvedValue(null) } });
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn() };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: false });

      expect(result.unresolvedMapEntries).toEqual(['ttpl_1']);
      expect(result.templatesProcessed).toBe(0);
    });

    it('surfaces a per-template failure (not a crash) when a mapped field would violate the image-only-accept rule', async () => {
      const prisma = makePrisma();
      const taskTemplateService = {
        updateTemplateWithSnapshot: jest.fn().mockRejectedValue(new Error('Invalid template schema')),
      };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      // A failed write is reported and the loop moves on to the next binding
      // rather than throwing. It still counts as "processed" (an attempt was
      // made) and as "failed" -- consistent with how an unresolved-field-key
      // abort is counted, and unlike an unresolved MAP ENTRY (template not
      // found at all), which never reaches an attempt.
      expect(result.templatesFailed).toBe(1);
      expect(result.templatesProcessed).toBe(1);
      expect(result.snapshotsBound).toBe(0);
    });

    it('binds a historical snapshot referenced by a live Task without rewriting its schema', async () => {
      const historicalSnapshot = {
        id: 99n,
        version: 1,
        schema: {
          items: [
            { id: 'a', key: 'scene_photo', type: 'file', label: 'Old label', validation: { accept: 'image/*' } },
          ],
        },
      };
      const prisma = makePrisma({
        taskTemplate: { findFirst: jest.fn().mockResolvedValue(v1Template({ version: 2 })) },
        taskTemplateSnapshot: { findMany: jest.fn().mockResolvedValue([historicalSnapshot]) },
        taskTemplateSceneQcEvidenceRef: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      });
      const taskTemplateService = { updateTemplateWithSnapshot: jest.fn().mockResolvedValue({}) };

      const result = await runBackfill({ prisma: prisma as any, taskTemplateService, bindings, apply: true });

      expect(prisma.taskTemplateSceneQcEvidenceRef.createMany).toHaveBeenCalledWith({
        data: [{ templateId: 1n, snapshotId: 99n, fieldKey: 'scene_photo', label: 'Old label' }],
        skipDuplicates: true,
      });
      expect(result.rowsCreated).toBe(1);
    });
  });

  describe('hasUnresolvedOrFailedBindings', () => {
    const CLEAN_RESULT = {
      templatesProcessed: 1,
      templatesAlreadyMarked: 0,
      templatesFailed: 0,
      snapshotsBound: 1,
      rowsCreated: 0,
      unresolvedFieldKeys: [],
      unresolvedMapEntries: [],
    };

    it('is false when nothing failed or went unresolved', () => {
      expect(hasUnresolvedOrFailedBindings(CLEAN_RESULT)).toBe(false);
    });

    it('is true when any template failed', () => {
      expect(hasUnresolvedOrFailedBindings({ ...CLEAN_RESULT, templatesFailed: 1 })).toBe(true);
    });

    it('is true when any field key is unresolved', () => {
      expect(hasUnresolvedOrFailedBindings({
        ...CLEAN_RESULT,
        unresolvedFieldKeys: [{ templateUid: 'ttpl_1', fieldKey: 'x' }],
      })).toBe(true);
    });

    it('is true when any map entry is unresolved (template not found)', () => {
      expect(hasUnresolvedOrFailedBindings({ ...CLEAN_RESULT, unresolvedMapEntries: ['ttpl_1'] })).toBe(true);
    });
  });
});
