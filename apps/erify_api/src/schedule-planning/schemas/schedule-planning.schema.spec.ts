import {
  planDocumentSchema,
  publishScheduleSummarySchema,
} from './schedule-planning.schema';

describe('schedulePlanningSchema', () => {
  describe('planDocumentSchema', () => {
    it('normalizes creators[] to legacy mcs[] when only creator assignments are provided', () => {
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
      expect(parsed.shows[0].mcs).toEqual([{ mcId: 'mc_1', note: 'Lead' }]);
    });

    it('normalizes legacy mcs[] to creators[] when only mc assignments are provided', () => {
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
            mcs: [{ mcId: 'mc_1', note: 'Lead' }],
          },
        ],
      });

      expect(parsed.shows[0].mcs).toEqual([{ mcId: 'mc_1', note: 'Lead' }]);
      expect(parsed.shows[0].creators).toEqual([{ creatorId: 'mc_1', note: 'Lead' }]);
    });
  });

  describe('publishScheduleSummarySchema', () => {
    it('derives creator links from legacy mc links', () => {
      const parsed = publishScheduleSummarySchema.parse({
        shows_created: 1,
        shows_updated: 2,
        shows_cancelled: 0,
        shows_pending_resolution: 0,
        shows_restored: 0,
        mc_links_added: 3,
        mc_links_updated: 4,
        mc_links_removed: 5,
        platform_links_added: 1,
        platform_links_updated: 1,
        platform_links_removed: 0,
      });

      expect(parsed.creator_links_added).toBe(3);
      expect(parsed.creator_links_updated).toBe(4);
      expect(parsed.creator_links_removed).toBe(5);
    });

    it('derives legacy mc links from creator links', () => {
      const parsed = publishScheduleSummarySchema.parse({
        shows_created: 1,
        shows_updated: 2,
        shows_cancelled: 0,
        shows_pending_resolution: 0,
        shows_restored: 0,
        creator_links_added: 6,
        creator_links_updated: 7,
        creator_links_removed: 8,
        platform_links_added: 1,
        platform_links_updated: 1,
        platform_links_removed: 0,
      });

      expect(parsed.mc_links_added).toBe(6);
      expect(parsed.mc_links_updated).toBe(7);
      expect(parsed.mc_links_removed).toBe(8);
    });
  });
});
