import {
  planDocumentSchema,
  publishScheduleSummarySchema,
} from './schedule-planning.schema';

describe('schedulePlanningSchema', () => {
  describe('planDocumentSchema', () => {
    it('keeps creators[] assignments in creator-only payload', () => {
      const parsed = planDocumentSchema.parse({
        metadata: {
          lastEditedBy: 'user_1',
          lastEditedAt: '2026-03-11T00:00:00.000Z',
          totalShows: 1,
          clientName: 'Client',
          dateRange: {
            start: '2026-03-11T00:00:00.000Z',
            end: '2026-03-12T00:00:00.000Z',
          },
        },
        shows: [
          {
            external_id: 'ext_1',
            name: 'Show 1',
            startTime: '2026-03-11T10:00:00.000Z',
            endTime: '2026-03-11T12:00:00.000Z',
            clientId: 'client_123',
            showTypeId: 'sht_123',
            showStatusId: 'shst_123',
            showStandardId: 'shsd_123',
            creators: [{ creatorId: 'mc_1', note: 'Lead' }],
          },
        ],
      });

      expect(parsed.shows[0].creators).toEqual([{ creatorId: 'mc_1', note: 'Lead' }]);
      expect(parsed.shows[0]).not.toHaveProperty('mcs');
    });

    it('rejects legacy mcs[] assignments at API boundary', () => {
      const result = planDocumentSchema.safeParse({
        metadata: {
          lastEditedBy: 'user_1',
          lastEditedAt: '2026-03-11T00:00:00.000Z',
          totalShows: 1,
          clientName: 'Client',
          dateRange: {
            start: '2026-03-11T00:00:00.000Z',
            end: '2026-03-12T00:00:00.000Z',
          },
        },
        shows: [
          {
            external_id: 'ext_1',
            name: 'Show 1',
            startTime: '2026-03-11T10:00:00.000Z',
            endTime: '2026-03-11T12:00:00.000Z',
            clientId: 'client_123',
            showTypeId: 'sht_123',
            showStatusId: 'shst_123',
            showStandardId: 'shsd_123',
            mcs: [{ mcId: 'mc_1', note: 'Lead' }],
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('publishScheduleSummarySchema', () => {
    it('accepts creator-only publish summary', () => {
      const parsed = publishScheduleSummarySchema.parse({
        shows_created: 1,
        shows_updated: 2,
        shows_cancelled: 0,
        shows_pending_resolution: 0,
        shows_restored: 0,
        creator_links_added: 3,
        creator_links_updated: 4,
        creator_links_removed: 5,
        platform_links_added: 1,
        platform_links_updated: 1,
        platform_links_removed: 0,
      });

      expect(parsed.creator_links_added).toBe(3);
      expect(parsed.creator_links_updated).toBe(4);
      expect(parsed.creator_links_removed).toBe(5);
    });

    it('rejects legacy mc_links aliases at API boundary', () => {
      const result = publishScheduleSummarySchema.safeParse({
        shows_created: 1,
        shows_updated: 2,
        shows_cancelled: 0,
        shows_pending_resolution: 0,
        shows_restored: 0,
        mc_links_added: 6,
        mc_links_updated: 7,
        mc_links_removed: 8,
        platform_links_added: 1,
        platform_links_updated: 1,
        platform_links_removed: 0,
      });

      expect(result.success).toBe(false);
    });
  });
});
