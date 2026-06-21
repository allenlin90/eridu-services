import {
  ensureLocalDatabase,
  runConsolidation,
  validateMergePlan,
} from './consolidate-duplicate-mechanics';

describe('consolidate-duplicate-mechanics script', () => {
  describe('ensureLocalDatabase', () => {
    it('allows a localhost DATABASE_URL', () => {
      expect(() => ensureLocalDatabase('postgresql://x@localhost:5432/db', undefined)).not.toThrow();
    });

    it('refuses a non-local DATABASE_URL without ALLOW_PROD', () => {
      expect(() => ensureLocalDatabase('postgresql://x@prod.example.com:5432/db', undefined)).toThrow();
    });
  });

  describe('validateMergePlan', () => {
    const client = 'client_acme';

    it('accepts a plan with disjoint duplicate sets', () => {
      expect(() => validateMergePlan([
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_a', duplicateUids: ['cmech_b'], reason: 'r' },
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_c', duplicateUids: ['cmech_d'], reason: 'r' },
      ])).not.toThrow();
    });

    it('rejects a duplicate uid appearing in two groups', () => {
      expect(() => validateMergePlan([
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_a', duplicateUids: ['cmech_b'], reason: 'r' },
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_c', duplicateUids: ['cmech_b'], reason: 'r' },
      ])).toThrow(/more than one group/);
    });

    it('rejects a uid that is both a canonical and a duplicate', () => {
      expect(() => validateMergePlan([
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_a', duplicateUids: ['cmech_b'], reason: 'r' },
        { clientUid: client, clientName: 'Acme', canonicalUid: 'cmech_b', duplicateUids: ['cmech_c'], reason: 'r' },
      ])).toThrow(/both a canonical and a duplicate/);
    });
  });

  describe('runConsolidation', () => {
    let mockPrisma: any;
    let mockTaskTemplateService: any;
    let mockClientMechanicService: any;
    let mockLogger: jest.Mock;

    const plan = [
      {
        clientUid: 'client_acme',
        clientName: 'Acme',
        canonicalUid: 'cmech_canon',
        duplicateUids: ['cmech_dup'],
        reason: 'whitespace-only diff',
      },
    ];

    const canonicalRow = {
      uid: 'cmech_canon',
      contentRevision: 3,
      instructionLabel: 'Product mechanic',
      instructionBody: 'Canonical text',
      client: { uid: 'client_acme' },
    };

    function templateRow(overrides: Partial<any> = {}) {
      return {
        id: 10n,
        uid: 'ttpl_acme_bau',
        version: 5,
        studio: { uid: 'std_1' },
        currentSchema: {
          items: [
            {
              id: 'fld_1',
              key: 'l1_dup',
              type: 'checkbox',
              group: 'l1',
              label: 'Product mechanic',
              description: 'Stale text',
              mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_dup', content_revision: 1 },
            },
          ],
        },
        ...overrides,
      };
    }

    beforeEach(() => {
      mockLogger = jest.fn();
      mockPrisma = {
        clientMechanic: { findMany: jest.fn().mockResolvedValue([canonicalRow]) },
        taskTemplate: { findMany: jest.fn() },
      };
      mockTaskTemplateService = { updateTemplateWithSnapshot: jest.fn() };
      mockClientMechanicService = { retireMechanic: jest.fn() };
    });

    it('throws when a canonical mechanic cannot be found', async () => {
      mockPrisma.clientMechanic.findMany.mockResolvedValue([]);
      mockPrisma.taskTemplate.findMany.mockResolvedValue([]);

      await expect(runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: false,
        logger: mockLogger,
      })).rejects.toThrow(/not found or deleted/);
    });

    it('throws when the canonical belongs to a different client than the plan expects', async () => {
      mockPrisma.clientMechanic.findMany.mockResolvedValue([
        { ...canonicalRow, client: { uid: 'client_other' } },
      ]);
      mockPrisma.taskTemplate.findMany.mockResolvedValue([]);

      await expect(runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: false,
        logger: mockLogger,
      })).rejects.toThrow(/expected "client_acme"/);
    });

    it('ignores templates with no duplicate-referencing fields', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({ currentSchema: { items: [{ id: 'fld_1', key: 'k', type: 'text', label: 'Live Title' }] } }),
      ]);

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: false,
        logger: mockLogger,
      });

      expect(result.fieldsRemapped).toBe(0);
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
    });

    it('does not write anything in dry-run mode but still counts the planned remap', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: false,
        logger: mockLogger,
      });

      expect(result.fieldsRemapped).toBe(1);
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).not.toHaveBeenCalled();
      expect(mockClientMechanicService.retireMechanic).not.toHaveBeenCalled();
    });

    it('in apply mode, remaps the field to the canonical and retires the duplicate', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([templateRow()]);

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: true,
        logger: mockLogger,
      });

      expect(mockTaskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        'ttpl_acme_bau',
        'std_1',
        expect.objectContaining({
          version: 5,
          currentSchema: expect.objectContaining({
            items: [
              expect.objectContaining({
                id: 'fld_1',
                label: 'Product mechanic',
                description: 'Canonical text',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_canon', content_revision: 3 },
              }),
            ],
          }),
        }),
      );
      expect(mockClientMechanicService.retireMechanic).toHaveBeenCalledWith({
        mechanicUid: 'cmech_dup',
        clientUid: 'client_acme',
      });
      expect(result.fieldsRemapped).toBe(1);
      expect(result.templatesUpdated).toBe(1);
      expect(result.mechanicsRetired).toBe(1);
    });

    it('drops the duplicate field instead of remapping when the canonical already occupies that loop', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({
          currentSchema: {
            items: [
              {
                id: 'fld_1',
                key: 'l1_dup',
                type: 'checkbox',
                group: 'l1',
                label: 'Product mechanic',
                description: 'Stale text',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_dup', content_revision: 1 },
              },
              {
                id: 'fld_2',
                key: 'l1_canon',
                type: 'checkbox',
                group: 'l1',
                label: 'Product mechanic',
                description: 'Canonical text',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_canon', content_revision: 3 },
              },
            ],
          },
        }),
      ]);

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: true,
        logger: mockLogger,
      });

      expect(result.fieldsRemapped).toBe(0);
      expect(result.fieldsDroppedAsLoopCollision).toBe(1);
      expect(mockTaskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        'ttpl_acme_bau',
        'std_1',
        expect.objectContaining({
          currentSchema: expect.objectContaining({
            items: [
              expect.objectContaining({ id: 'fld_2', mechanic_ref: expect.objectContaining({ mechanic_id: 'cmech_canon' }) }),
            ],
          }),
        }),
      );
    });

    it('remaps duplicates in different loops independently without collision', async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        templateRow({
          currentSchema: {
            items: [
              {
                id: 'fld_1',
                key: 'l1_dup',
                type: 'checkbox',
                group: 'l1',
                label: 'Product mechanic',
                description: 'Stale text',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_dup', content_revision: 1 },
              },
              {
                id: 'fld_2',
                key: 'l2_dup',
                type: 'checkbox',
                group: 'l2',
                label: 'Product mechanic',
                description: 'Stale text',
                mechanic_ref: { client_id: 'client_acme', mechanic_id: 'cmech_dup', content_revision: 1 },
              },
            ],
          },
        }),
      ]);

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan,
        apply: false,
        logger: mockLogger,
      });

      expect(result.fieldsRemapped).toBe(2);
      expect(result.fieldsDroppedAsLoopCollision).toBe(0);
    });

    it('continues retiring other duplicates when one retire call fails', async () => {
      const twoGroupPlan = [
        plan[0],
        { clientUid: 'client_acme', clientName: 'Acme', canonicalUid: 'cmech_canon2', duplicateUids: ['cmech_dup2'], reason: 'r' },
      ];
      mockPrisma.clientMechanic.findMany.mockResolvedValue([
        canonicalRow,
        { ...canonicalRow, uid: 'cmech_canon2' },
      ]);
      mockPrisma.taskTemplate.findMany.mockResolvedValue([]);
      mockClientMechanicService.retireMechanic
        .mockRejectedValueOnce(new Error('conflict'))
        .mockResolvedValueOnce({});

      const result = await runConsolidation({
        prisma: mockPrisma,
        taskTemplateService: mockTaskTemplateService,
        clientMechanicService: mockClientMechanicService,
        plan: twoGroupPlan,
        apply: true,
        logger: mockLogger,
      });

      expect(result.mechanicsRetired).toBe(1);
      expect(result.mechanicsRetireFailed).toBe(1);
    });
  });
});
