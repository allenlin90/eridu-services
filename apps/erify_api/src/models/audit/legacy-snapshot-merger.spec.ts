import type { AuditWithTargets } from './schemas/audit.schema';
import {
  auditToTimelineEntry,
  legacyMetadataToTimeline,
  mergeAuditTimeline,
} from './legacy-snapshot-merger';

describe('legacy-snapshot-merger', () => {
  describe('legacyMetadataToTimeline', () => {
    it('returns [] for null / missing / malformed metadata', () => {
      expect(legacyMetadataToTimeline(null)).toEqual([]);
      expect(legacyMetadataToTimeline(undefined)).toEqual([]);
      expect(legacyMetadataToTimeline('not-an-object')).toEqual([]);
      expect(legacyMetadataToTimeline({})).toEqual([]);
      expect(legacyMetadataToTimeline({ audit: 'oops' })).toEqual([]);
      expect(legacyMetadataToTimeline({ audit: { snapshot_overrides: 'oops' } })).toEqual([]);
    });

    it('projects each legacy override entry into the unified timeline shape', () => {
      const metadata = {
        audit: {
          snapshot_overrides: [
            {
              field: 'hourly_rate',
              old_value: '150.00',
              new_value: '175.00',
              actor_ext_id: 'auth0|abc',
              at: '2026-04-01T10:00:00.000Z',
              reason: 'rate correction',
            },
            {
              field: 'note',
              old_value: null,
              new_value: 'late entry',
              actor_ext_id: 'auth0|abc',
              at: '2026-04-02T11:00:00.000Z',
            },
          ],
        },
      };

      const entries = legacyMetadataToTimeline(metadata);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        source: 'legacy_snapshot_override',
        action: 'OVERRIDE',
        field: 'hourly_rate',
        old_value: '150.00',
        new_value: '175.00',
        actor_uid: null,
        actor_ext_id: 'auth0|abc',
        reason: 'rate correction',
        ingestion_source: null,
        at: '2026-04-01T10:00:00.000Z',
        audit_uid: null,
      });
      expect(entries[1].reason).toBeNull();
    });

    it('skips entries that lack a usable timestamp', () => {
      const metadata = {
        audit: {
          snapshot_overrides: [
            { field: 'x', old_value: 1, new_value: 2, actor_ext_id: 'a' },
            { field: 'y', old_value: 1, new_value: 2, actor_ext_id: 'a', at: 123 },
          ],
        },
      };
      expect(legacyMetadataToTimeline(metadata)).toEqual([]);
    });
  });

  describe('auditToTimelineEntry', () => {
    function buildAudit(overrides: Partial<AuditWithTargets> = {}): AuditWithTargets {
      return {
        id: BigInt(1),
        uid: 'aud_one',
        action: 'CREATE',
        actorId: null,
        ipAddress: null,
        userAgent: null,
        reason: null,
        metadata: {} as any,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        targets: [],
        ...overrides,
      } as AuditWithTargets;
    }

    it('reads field/old_value/new_value from metadata and resolves the actor uid via the supplied map', () => {
      const audit = buildAudit({
        action: 'OVERRIDE',
        actorId: BigInt(42),
        reason: 'late camera start',
        metadata: {
          ingestion_source: 'manager_override',
          fact_key: 'show_actual_start_time',
          old_value: '2026-04-01T10:00:00.000Z',
          new_value: '2026-04-01T10:05:00.000Z',
        } as any,
      });

      const entry = auditToTimelineEntry(
        audit,
        new Map([[BigInt(42), 'user_alice']]),
      );

      expect(entry).toEqual({
        source: 'audit',
        action: 'OVERRIDE',
        field: 'show_actual_start_time',
        old_value: '2026-04-01T10:00:00.000Z',
        new_value: '2026-04-01T10:05:00.000Z',
        actor_uid: 'user_alice',
        actor_ext_id: null,
        reason: 'late camera start',
        ingestion_source: 'manager_override',
        at: '2026-05-01T00:00:00.000Z',
        audit_uid: 'aud_one',
      });
    });

    it('prefers the reason column over a legacy metadata.reason value', () => {
      const audit = buildAudit({
        reason: 'authoritative',
        metadata: { reason: 'legacy-fallback' } as any,
      });
      expect(auditToTimelineEntry(audit).reason).toBe('authoritative');
    });

    it('falls back to metadata.reason when the column is null (legacy back-fill path)', () => {
      const audit = buildAudit({
        reason: null,
        metadata: { reason: 'legacy-fallback' } as any,
      });
      expect(auditToTimelineEntry(audit).reason).toBe('legacy-fallback');
    });

    it('falls back to task_field_id when fact_key is absent and tolerates a missing actor map', () => {
      const audit = buildAudit({
        actorId: BigInt(7),
        metadata: { task_field_id: 'fld_attendance_creator_creator_x' } as any,
      });

      const entry = auditToTimelineEntry(audit);
      expect(entry.field).toBe('fld_attendance_creator_creator_x');
      expect(entry.actor_uid).toBeNull();
    });
  });

  describe('mergeAuditTimeline', () => {
    it('merges both sources and sorts newest first', () => {
      const legacy = legacyMetadataToTimeline({
        audit: {
          snapshot_overrides: [
            { field: 'a', actor_ext_id: 'x', at: '2026-04-01T10:00:00.000Z' },
            { field: 'b', actor_ext_id: 'x', at: '2026-04-03T10:00:00.000Z' },
          ],
        },
      });
      const newAudit = auditToTimelineEntry({
        id: BigInt(1),
        uid: 'aud_2',
        action: 'CREATE',
        actorId: null,
        ipAddress: null,
        userAgent: null,
        reason: null,
        metadata: {} as any,
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
        targets: [],
      } as AuditWithTargets);

      const merged = mergeAuditTimeline(legacy, [newAudit]);
      expect(merged.map((e) => e.at)).toEqual([
        '2026-04-03T10:00:00.000Z',
        '2026-04-02T10:00:00.000Z',
        '2026-04-01T10:00:00.000Z',
      ]);
    });
  });
});
