import { findInScopeSnapshots, runVerify } from './verify-scene-qc-evidence-bindings';

describe('verify-scene-qc-evidence-bindings script', () => {
  describe('findInScopeSnapshots', () => {
    it('excludes a row whose show status is CANCELLED (the only excluded status)', async () => {
      const prisma: any = {
        $queryRaw: jest.fn().mockResolvedValue([
          { snapshot_id: 1n, template_id: 10n, template_uid: 'ttpl_1', version: 1, show_status_system_key: 'CANCELLED' },
          { snapshot_id: 2n, template_id: 11n, template_uid: 'ttpl_2', version: 1, show_status_system_key: 'CONFIRMED' },
        ]),
      };

      const rows = await findInScopeSnapshots(prisma, new Date('2026-01-01'));

      expect(rows).toHaveLength(1);
      expect(rows[0].template_uid).toBe('ttpl_2');
    });

    it('keeps a row with a null show status system key (deny-list semantics, not allow-list)', async () => {
      const prisma: any = {
        $queryRaw: jest.fn().mockResolvedValue([
          { snapshot_id: 1n, template_id: 10n, template_uid: 'ttpl_1', version: 1, show_status_system_key: null },
        ]),
      };

      const rows = await findInScopeSnapshots(prisma, new Date('2026-01-01'));
      expect(rows).toHaveLength(1);
    });
  });

  describe('runVerify', () => {
    function makePrisma(inScope: any[], bound: any[] = []) {
      return {
        $queryRaw: jest.fn().mockResolvedValue(inScope),
        taskTemplateSceneQcEvidenceRef: {
          findMany: jest.fn().mockResolvedValue(bound),
        },
      };
    }

    it('reports zero violations when every in-scope snapshot is bound', async () => {
      const prisma = makePrisma(
        [{ snapshot_id: 1n, template_id: 10n, template_uid: 'ttpl_1', version: 1, show_status_system_key: 'CONFIRMED' }],
        [{ snapshotId: 1n, fieldKey: 'scene_photo' }],
      );

      const result = await runVerify({ prisma: prisma as any, since: new Date('2026-01-01') });

      expect(result.violations).toEqual([]);
      expect(result.boundCount).toBe(1);
    });

    it('reports a violation for an in-scope, unbound, non-intentionally-unbound snapshot', async () => {
      const prisma = makePrisma(
        [{ snapshot_id: 1n, template_id: 10n, template_uid: 'ttpl_1', version: 1, show_status_system_key: 'CONFIRMED' }],
        [],
      );

      const result = await runVerify({ prisma: prisma as any, since: new Date('2026-01-01') });

      expect(result.violations).toEqual([{ templateUid: 'ttpl_1', snapshotId: '1', version: 1 }]);
    });

    it('suppresses a violation for a template listed in SCENE_QC_INTENTIONALLY_UNBOUND', async () => {
      const prisma = makePrisma(
        [{ snapshot_id: 1n, template_id: 10n, template_uid: 'ttpl_1', version: 1, show_status_system_key: 'CONFIRMED' }],
        [],
      );

      const result = await runVerify({
        prisma: prisma as any,
        since: new Date('2026-01-01'),
        intentionallyUnbound: [{ templateUid: 'ttpl_1', reason: 'legacy template, reviewed 2026-07-01' }],
      });

      expect(result.violations).toEqual([]);
      expect(result.intentionallyUnboundCount).toBe(1);
    });

    it('skips the ref lookup entirely (no query) when nothing is in scope', async () => {
      const prisma = makePrisma([]);

      const result = await runVerify({ prisma: prisma as any, since: new Date('2026-01-01') });

      expect(prisma.taskTemplateSceneQcEvidenceRef.findMany).not.toHaveBeenCalled();
      expect(result.inScopeCount).toBe(0);
      expect(result.violations).toEqual([]);
    });
  });
});
