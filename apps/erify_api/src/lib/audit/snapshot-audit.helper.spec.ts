import { Prisma } from '@prisma/client';

import { appendSnapshotAudit, isSnapshotValueEqual } from './snapshot-audit.helper';

describe('snapshotAuditHelper', () => {
  describe('isSnapshotValueEqual', () => {
    it('should return true for identical strings', () => {
      expect(isSnapshotValueEqual('FIXED', 'FIXED')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(isSnapshotValueEqual('FIXED', 'COMMISSION')).toBe(false);
    });

    it('should return true for identical Decimals', () => {
      const d1 = new Prisma.Decimal('100.00');
      const d2 = new Prisma.Decimal('100.00');
      expect(isSnapshotValueEqual(d1, d2)).toBe(true);
    });

    it('should return true for Decimal and string equivalent', () => {
      const d1 = new Prisma.Decimal('100.00');
      expect(isSnapshotValueEqual(d1, '100')).toBe(true);
      expect(isSnapshotValueEqual('100.00', d1)).toBe(true);
    });

    it('should return false for different Decimals', () => {
      const d1 = new Prisma.Decimal('100.00');
      const d2 = new Prisma.Decimal('101.00');
      expect(isSnapshotValueEqual(d1, d2)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isSnapshotValueEqual(null, null)).toBe(true);
      expect(isSnapshotValueEqual(undefined, undefined)).toBe(true);
      expect(isSnapshotValueEqual(null, undefined)).toBe(false);
      expect(isSnapshotValueEqual('foo', null)).toBe(false);
    });

    it('should handle Dates', () => {
      const d1 = new Date('2026-01-01T00:00:00Z');
      const d2 = new Date('2026-01-01T00:00:00Z');
      const d3 = new Date('2026-01-02T00:00:00Z');
      expect(isSnapshotValueEqual(d1, d2)).toBe(true);
      expect(isSnapshotValueEqual(d1, d3)).toBe(false);
    });
  });

  describe('appendSnapshotAudit', () => {
    const actorExtId = 'user_actor123';

    it('should return original metadata if no changes', () => {
      const metadata = { foo: 'bar' };
      expect(appendSnapshotAudit(metadata, [], actorExtId)).toEqual(metadata);
    });

    it('should append new entries for each change', () => {
      const metadata = { existing: 'data' };
      const changes = [
        { field: 'agreed_rate', old_value: new Prisma.Decimal('50.00'), new_value: new Prisma.Decimal('60.00') },
        { field: 'compensation_type', old_value: 'FIXED', new_value: 'HYBRID' },
      ];
      const reason = 'Manager approved increase';

      const result = appendSnapshotAudit(metadata, changes, actorExtId, reason);

      expect(result.existing).toBe('data');
      expect(result.audit.snapshot_overrides).toHaveLength(2);

      const entry1 = result.audit.snapshot_overrides[0];
      expect(entry1.field).toBe('agreed_rate');
      expect(entry1.old_value).toBe('50');
      expect(entry1.new_value).toBe('60');
      expect(entry1.actor_ext_id).toBe(actorExtId);
      expect(entry1.reason).toBe(reason);
      expect(entry1.at).toBeDefined();

      const entry2 = result.audit.snapshot_overrides[1];
      expect(entry2.field).toBe('compensation_type');
      expect(entry2.old_value).toBe('FIXED');
      expect(entry2.new_value).toBe('HYBRID');
    });

    it('should preserve existing audit overrides', () => {
      const metadata = {
        audit: {
          snapshot_overrides: [
            { field: 'old_field', old_value: '1', new_value: '2', at: 'earlier' },
          ],
        },
      };
      const changes = [{ field: 'new_field', old_value: 'A', new_value: 'B' }];

      const result = appendSnapshotAudit(metadata, changes, actorExtId);

      expect(result.audit.snapshot_overrides).toHaveLength(2);
      expect(result.audit.snapshot_overrides[0].field).toBe('old_field');
      expect(result.audit.snapshot_overrides[1].field).toBe('new_field');
    });

    it('should handle null initial metadata', () => {
      const changes = [{ field: 'foo', old_value: 'bar', new_value: 'baz' }];
      const result = appendSnapshotAudit(null, changes, actorExtId);
      expect(result.audit.snapshot_overrides).toHaveLength(1);
    });
  });
});
