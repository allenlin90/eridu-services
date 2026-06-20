import {
  cleanLabel,
  ensureLocalDatabase,
  resolveClientForTemplate,
  runBackfill,
  shortSnippet,
} from './backfill-product-promotion-mechanics';

describe('backfill-product-promotion-mechanics script', () => {
  describe('cleanLabel', () => {
    it('fixes the "machenic" typo found in production data', () => {
      expect(cleanLabel('Product machenic')).toBe('Product mechanic');
      expect(cleanLabel('Promotion machenic')).toBe('Promotion mechanic');
    });

    it('leaves an already-correct label untouched', () => {
      expect(cleanLabel('Product mechanic')).toBe('Product mechanic');
    });
  });

  describe('shortSnippet', () => {
    it('truncates long text and flattens whitespace', () => {
      expect(shortSnippet('a'.repeat(60))).toBe(`${'a'.repeat(40)}…`);
      expect(shortSnippet('line one\nline   two')).toBe('line one line two');
    });

    it('leaves short text untouched', () => {
      expect(shortSnippet('short text')).toBe('short text');
    });
  });

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

  describe('resolveClientForTemplate', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn(),
        client: { findUnique: jest.fn() },
      };
    });

    it('resolves via show history when exactly one distinct client is found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 5n }]);
      mockPrisma.client.findUnique.mockResolvedValue({ id: 5n, uid: 'client_abc', name: 'Acme' });

      const result = await resolveClientForTemplate(mockPrisma, { id: 1n, name: 'Acme - BAU Moderator Workflow' }, new Map());

      expect(result).toEqual({ client: { id: 5n, uid: 'client_abc', name: 'Acme' }, reason: 'show-history' });
    });

    it('reports ambiguous when show history spans multiple clients', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 5n }, { client_id: 6n }]);

      const result = await resolveClientForTemplate(mockPrisma, { id: 1n, name: 'Acme - BAU Moderator Workflow' }, new Map());

      expect(result.client).toBeNull();
      expect(result.reason).toMatch(/ambiguous/);
    });

    it('falls back to a unique name match when there is no show history', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const clientsByName = new Map([
        ['acme', { id: 5n, uid: 'client_abc', name: 'Acme' }],
      ]);

      const result = await resolveClientForTemplate(mockPrisma, { id: 1n, name: 'Acme - BAU Moderator Workflow' }, clientsByName);

      expect(result).toEqual({ client: { id: 5n, uid: 'client_abc', name: 'Acme' }, reason: 'name-match' });
    });

    it('reports no match when no client name matches the template prefix', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const result = await resolveClientForTemplate(mockPrisma, { id: 1n, name: 'Unknown Co - BAU Moderator Workflow' }, new Map());

      expect(result.client).toBeNull();
      expect(result.reason).toMatch(/no client name matches/);
    });

    it('reports ambiguous when multiple client names match the template prefix', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const clientsByName = new Map([
        ['acme', { id: 5n, uid: 'client_abc', name: 'Acme' }],
        ['acme thailand', { id: 6n, uid: 'client_def', name: 'Acme Thailand' }],
      ]);

      const result = await resolveClientForTemplate(mockPrisma, { id: 1n, name: 'Acme - BAU Moderator Workflow' }, clientsByName);

      expect(result.client).toBeNull();
      expect(result.reason).toMatch(/ambiguous/);
    });
  });

  describe('runBackfill', () => {
    let mockPrisma: any;
    let mockTaskTemplateService: any;
    let mockClientMechanicService: any;
    let mockLogger: jest.Mock;

    const client = { id: 1n, uid: 'client_acme', name: 'Acme' };

    function templateRow(overrides: Partial<any> = {}) {
      return {
        id: 10n,
        uid: 'ttpl_acme_bau',
        name: 'Acme - BAU Moderator Workflow',
        version: 3,
        studio: { uid: 'std_1' },
        currentSchema: {
          items: [
            { id: 'fld_1', key: 'l1_product_machenic_a', type: 'checkbox', group: 'l1', label: 'Product machenic', description: 'Widget A' },
            { id: 'fld_2', key: 'l2_product_machenic_a', type: 'checkbox', group: 'l2', label: 'Product machenic', description: 'Widget A' },
            { id: 'fld_3', key: 'l1_other', type: 'text', group: 'l1', label: 'Live Title' },
          ],
        },
        ...overrides,
      };
    }

    beforeEach(() => {
      mockLogger = jest.fn();
      mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        client: {
          findMany: jest.fn().mockResolvedValue([client]),
          findUnique: jest.fn(),
        },
        taskTemplate: { findMany: jest.fn() },
        clientMechanic: { findMany: jest.fn().mockResolvedValue([]) },
      };
      mockTaskTemplateService = { updateTemplateWithSnapshot: jest.fn() };
      mockClientMechanicService = { createMechanic: jest.fn() };
    });

    it('ignores templates with no mechanic-pattern fields', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({ currentSchema: { items: [{ id: 'fld_1', key: 'k', type: 'text', label: 'Live Title' }] } }),
      ]);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      expect(result.templatesAffected).toBe(0);
    });

    it('skips a template when client resolution is ambiguous, without converting any fields', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }, { client_id: 2n }]);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      expect(result.templatesAffected).toBe(1);
      expect(result.templatesSkipped).toHaveLength(1);
      expect(result.fieldsConverted).toBe(0);
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
    });

    it('dedupes the same description across loops within one template, both counted as converted', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      // fld_1 (l1) and fld_2 (l2) share the same description but different
      // loops — both are legitimate per-loop assignments, not duplicates.
      expect(result.fieldsConverted).toBe(2);
      expect(result.duplicatesLeftUnconverted).toBe(0);
      expect(result.mechanicsCreated).toBe(1); // one catalog entry, reused across both loops
      expect(result.mechanicsReused).toBe(1);
    });

    it('leaves a true same-loop duplicate unconverted and counts it', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({
          currentSchema: {
            items: [
              { id: 'fld_1', key: 'a', type: 'checkbox', group: 'l1', label: 'Product machenic', description: 'Widget A' },
              { id: 'fld_2', key: 'b', type: 'checkbox', group: 'l1', label: 'Product machenic', description: 'Widget A' },
            ],
          },
        }),
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      expect(result.fieldsConverted).toBe(1);
      expect(result.duplicatesLeftUnconverted).toBe(1);
    });

    it('skips an item that already has a mechanic_ref (idempotent)', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({
          currentSchema: {
            items: [
              {
                id: 'fld_1',
                key: 'a',
                type: 'checkbox',
                group: 'l1',
                label: 'Product mechanic',
                description: 'Widget A',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_1', content_revision: 1 },
              },
            ],
          },
        }),
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      expect(result.fieldsConverted).toBe(0);
      expect(result.mechanicsCreated).toBe(0);
    });

    it('reuses an existing ClientMechanic row with the same instructionBody instead of creating a duplicate', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);
      mockPrisma.clientMechanic.findMany.mockResolvedValue([
        { uid: 'cmech_existing', contentRevision: 4, instructionBody: 'Widget A' },
      ]);

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: true,
        logger: mockLogger,
      });

      expect(mockClientMechanicService.createMechanic).not.toHaveBeenCalled();
      expect(result.mechanicsCreated).toBe(0);
      expect(result.mechanicsReused).toBe(2); // both loop occurrences reuse it
    });

    it('does not write anything in dry-run mode', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);

      await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: false,
        logger: mockLogger,
      });

      expect(mockClientMechanicService.createMechanic).not.toHaveBeenCalled();
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
    });

    it('in apply mode, creates a mechanic and calls updateTemplateWithSnapshot with the resolved clientUid and bumped items', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);
      mockClientMechanicService.createMechanic.mockResolvedValue({ uid: 'cmech_new', contentRevision: 1 });

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: true,
        logger: mockLogger,
      });

      expect(mockClientMechanicService.createMechanic).toHaveBeenCalledWith('client_acme', expect.objectContaining({
        instructionLabel: 'Product mechanic',
        instructionBody: 'Widget A',
      }));
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        'ttpl_acme_bau',
        'std_1',
        expect.objectContaining({
          version: 3,
          clientUid: 'client_acme',
          currentSchema: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                id: 'fld_1',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_new', content_revision: 1 },
              }),
            ]),
          }),
        }),
      );
      expect(result.templatesUpdated).toBe(1);
      expect(result.templatesFailed).toBe(0);
    });

    it('continues processing other templates when one update fails', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({ uid: 'ttpl_first' }),
        templateRow({ id: 11n, uid: 'ttpl_second' }),
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([{ client_id: 1n }]);
      mockPrisma.client.findUnique.mockResolvedValue(client);
      mockClientMechanicService.createMechanic.mockResolvedValue({ uid: 'cmech_new', contentRevision: 1 });
      mockTaskTemplateService.updateTemplateWithSnapshot
        .mockRejectedValueOnce(new Error('version conflict'))
        .mockResolvedValueOnce({});

      const result = await runBackfill({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        apply: true,
        logger: mockLogger,
      });

      expect(result.templatesUpdated).toBe(1);
      expect(result.templatesFailed).toBe(1);
    });
  });
});
