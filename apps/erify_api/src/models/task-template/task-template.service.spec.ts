import { Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';

import { StudioService } from '@/models/studio/studio.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('taskTemplateService', () => {
  let service: TaskTemplateService;
  let repository: jest.Mocked<TaskTemplateRepository>;
  let _utilityService: UtilityService;
  let studioService: jest.Mocked<StudioService>;

  beforeEach(async () => {
    const repositoryMock = createMockRepository<TaskTemplateRepository>();
    const utilityMock = createMockUtilityService('ttpl_test123');
    const studioServiceMock = {
      getSharedFields: jest.fn().mockResolvedValue([]),
    };

    const module = await createModelServiceTestModule({
      serviceClass: TaskTemplateService,
      repositoryClass: TaskTemplateRepository,
      repositoryMock,
      utilityMock,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      additionalProviders: [
        {
          provide: StudioService,
          useValue: studioServiceMock,
        },
      ],
    });

    service = module.get<TaskTemplateService>(TaskTemplateService);
    repository = module.get<TaskTemplateRepository>(TaskTemplateRepository) as jest.Mocked<TaskTemplateRepository>;
    _utilityService = module.get<UtilityService>(UtilityService);
    studioService = module.get(StudioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSchema', () => {
    // Helper to create basic valid schema
    const createValidSchema = () => ({
      metadata: {
        task_type: 'SETUP',
      },
      items: [
        {
          id: 'item_1',
          key: 'simple_check',
          type: 'checkbox' as const,
          label: 'Simple Check',
          required: true,
        },
      ],
    });

    it('should pass for a valid schema', () => {
      const schema = createValidSchema();
      expect(() => service.validateSchema(schema)).not.toThrow();
    });

    it('should throw if key is not snake_case', () => {
      const schema = createValidSchema();
      schema.items[0].key = 'CamelCaseKey';

      expect(() => service.validateSchema(schema)).toThrow();
    });

    it('should throw if metadata.task_type is an unknown value', () => {
      const schema = createValidSchema();
      schema.metadata.task_type = 'NOT_A_REAL_TYPE';

      expect(() => service.validateSchema(schema)).toThrow(/valid task type/);
    });

    it('should throw if metadata.task_type is missing', () => {
      const schema = { ...createValidSchema(), metadata: {} };

      expect(() => service.validateSchema(schema)).toThrow(/valid task type/);
    });

    it('should throw if duplicate keys exist', () => {
      const schema = {
        metadata: {
          task_type: 'SETUP',
        },
        items: [
          {
            id: 'item_1',
            key: 'duplicate_key',
            type: 'text' as const,
            label: 'Field 1',
          },
          {
            id: 'item_2',
            key: 'duplicate_key',
            type: 'text' as const,
            label: 'Field 2',
          },
        ],
      };

      try {
        service.validateSchema(schema);
        // Fail if it doesn't throw
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Invalid template schema');
        // Check formatted Zod details or issue structure
        const response = error.getResponse();
        expect(JSON.stringify(response.details)).toMatch(/Duplicate key detected/);
      }
    });

    it('should throw if select field has no options', () => {
      const schema = {
        metadata: {
          task_type: 'SETUP',
        },
        items: [
          {
            id: 'item_1',
            key: 'my_select',
            type: 'select' as const,
            label: 'Select Something',
            options: [],
          },
        ],
      };

      try {
        service.validateSchema(schema);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Invalid template schema');
        const response = error.getResponse();
        expect(JSON.stringify(response.details)).toMatch(/Options are required/);
      }
    });

    it('should throw when grouped fields exist but metadata.loops is missing', () => {
      const schema = {
        metadata: {
          task_type: 'ACTIVE',
        },
        items: [
          {
            id: 'item_1',
            key: 'loop_step',
            type: 'checkbox' as const,
            label: 'Loop Step',
            group: 'l1',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).toThrow(/Loop metadata is required/);
    });

    it('should throw when grouped field references unknown loop id', () => {
      const schema = {
        metadata: {
          task_type: 'ACTIVE',
          loops: [
            { id: 'l1', name: 'Loop 1', durationMin: 15 },
          ],
        },
        items: [
          {
            id: 'item_1',
            key: 'loop_step',
            type: 'checkbox' as const,
            label: 'Loop Step',
            group: 'l2',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).toThrow(/must match metadata\.loops/);
    });

    it('should throw when metadata.loops is defined but no fields have a group', () => {
      const schema = {
        metadata: {
          task_type: 'ACTIVE',
          loops: [
            { id: 'l1', name: 'Loop 1', durationMin: 15 },
          ],
        },
        items: [
          {
            id: 'item_1',
            key: 'step_1',
            type: 'checkbox' as const,
            label: 'Step 1',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).toThrow(/no fields have a group/);
    });

    it('should throw when moderation template has ungrouped fields mixed in', () => {
      const schema = {
        metadata: {
          task_type: 'ACTIVE',
          loops: [
            { id: 'l1', name: 'Loop 1', durationMin: 15 },
          ],
        },
        items: [
          {
            id: 'item_1',
            key: 'l1_step_1',
            type: 'checkbox' as const,
            label: 'Step 1',
            group: 'l1',
          },
          {
            id: 'item_2',
            key: 'ungrouped_note',
            type: 'text' as const,
            label: 'Note without group',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).toThrow(/Ungrouped fields/);
    });

    it('should pass when grouped fields map to metadata.loops ids', () => {
      const schema = {
        metadata: {
          task_type: 'ACTIVE',
          loops: [
            { id: 'l1', name: 'Loop 1', durationMin: 15 },
          ],
        },
        items: [
          {
            id: 'item_1',
            key: 'loop_step',
            type: 'checkbox' as const,
            label: 'Loop Step',
            group: 'l1',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).not.toThrow();
    });

    describe('require_reason validation', () => {
      it('should pass for valid boolean require_reason', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'bool_check',
              type: 'checkbox' as const,
              label: 'Check',
              validation: {
                require_reason: 'on-false' as const,
              },
            },
          ],
        };
        expect(() => service.validateSchema(schema)).not.toThrow();
      });

      it('should throw if boolean require_reason used on number', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'num_field',
              type: 'number' as const,
              label: 'Num',
              validation: {
                require_reason: 'on-false' as any,
              },
            },
          ],
        };
        expect(() => service.validateSchema(schema)).toThrow(/only allowed on checkbox/);
      });

      it('should pass for valid numeric require_reason', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'camera_count',
              type: 'number' as const,
              label: 'Count',
              validation: {
                require_reason: [
                  { op: 'lt' as const, value: 3 },
                  { op: 'gte' as const, value: 5 },
                ],
              },
            },
          ],
        };
        expect(() => service.validateSchema(schema)).not.toThrow();
      });

      it('should throw if numeric criteria require_reason used on checkbox', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'check_field',
              type: 'checkbox' as const,
              label: 'Check',
              validation: {
                require_reason: [{ op: 'lt', value: 3 }] as any,
              },
            },
          ],
        };
        expect(() => service.validateSchema(schema)).toThrow(/do not support property-based/);
      });
    });

    describe('shared field validation', () => {
      it('should pass when standard field key and type match studio shared fields', async () => {
        studioService.getSharedFields.mockResolvedValueOnce([
          {
            key: 'gmv',
            type: 'number',
            category: 'metric',
            label: 'GMV',
            is_active: true,
          },
        ]);

        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'gmv',
              standard: true,
              type: 'number' as const,
              label: 'GMV',
              required: true,
            },
          ],
        };

        const sharedFieldsByKey = new Map((await studioService.getSharedFields('std_1')).map((field) => [field.key, field]));
        expect(() => service.validateSchema(schema, sharedFieldsByKey)).not.toThrow();
      });

      it('should throw when standard field key is not in shared fields', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'unknown_shared_key',
              standard: true,
              type: 'number' as const,
              label: 'Unknown Shared Field',
              required: true,
            },
          ],
        };

        expect(() => service.validateSchema(schema, new Map())).toThrow(/is not configured in studio settings/);
      });

      it('should throw when standard field type mismatches shared field type', () => {
        const schema = {
          metadata: {
            task_type: 'SETUP',
          },
          items: [
            {
              id: 'item_1',
              key: 'gmv',
              standard: true,
              type: 'text' as const,
              label: 'GMV',
              required: true,
            },
          ],
        };

        const sharedFieldsByKey = new Map([
          ['gmv', {
            key: 'gmv',
            type: 'number' as const,
            category: 'metric' as const,
            label: 'GMV',
            is_active: true,
          }],
        ]);
        expect(() => service.validateSchema(schema, sharedFieldsByKey)).toThrow(/must use type "number"/);
      });
    });

    describe('system fact key validation', () => {
      const createV2Schema = (item: Record<string, unknown>) => ({
        schema_version: 2 as const,
        schema_engine: 'task_template_v2' as const,
        content_key_strategy: 'field_id' as const,
        report_projection_strategy: 'descriptor' as const,
        metadata: {
          task_type: 'ACTIVE',
        },
        items: [
          {
            id: 'fld_actualstart1',
            key: 'show_actual_start',
            type: 'datetime' as const,
            label: 'Show actual start',
            required: true,
            ...item,
          },
        ],
      });

      it('should pass when a v2 system fact key matches the field type', () => {
        const schema = createV2Schema({
          system_fact_key: 'show_actual_start_time',
        });

        expect(() => service.validateSchema(schema)).not.toThrow();
      });

      it('should throw when a v2 system fact key is bound to an incompatible field type', () => {
        const schema = createV2Schema({
          type: 'text',
          system_fact_key: 'show_actual_start_time',
        });

        try {
          service.validateSchema(schema);
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toBe('Invalid template schema');
          const response = error.getResponse();
          expect(JSON.stringify(response.details)).toMatch(/requires field type/);
          expect(JSON.stringify(response.details)).toMatch(/datetime/);
        }
      });

      it('should throw when a v2 system fact key is bound more than once in a template', () => {
        const schema = createV2Schema({
          system_fact_key: 'show_actual_start_time',
        });
        (schema.items as Array<Record<string, unknown>>).push({
          id: 'fld_actualstart2',
          key: 'show_actual_start_duplicate',
          type: 'datetime',
          label: 'Show actual start duplicate',
          required: true,
          system_fact_key: 'show_actual_start_time',
        });

        try {
          service.validateSchema(schema);
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toBe('Invalid template schema');
          const response = error.getResponse();
          expect(JSON.stringify(response.details)).toMatch(/Duplicate system fact binding/);
          expect(JSON.stringify(response.details)).toMatch(/show_actual_start_time/);
        }
      });
    });

    describe('client mechanic validation', () => {
      const createMechanicSchema = (mechanicClientId: string) => ({
        schema_version: 2 as const,
        schema_engine: 'task_template_v2' as const,
        content_key_strategy: 'field_id' as const,
        report_projection_strategy: 'descriptor' as const,
        metadata: {
          task_type: 'ACTIVE',
        },
        items: [
          {
            id: 'fld_mechfield1',
            key: 'test_mechanic',
            type: 'checkbox' as const,
            label: 'Test Mechanic',
            required: true,
            mechanic_ref: {
              client_id: mechanicClientId,
              mechanic_id: 'cmech_123',
              content_revision: 1,
            },
          },
        ],
      });

      it('should pass when mechanic client matches the template client', () => {
        const schema = createMechanicSchema('client_abc123');
        expect(() => service.validateSchema(schema, new Map(), 'client_abc123')).not.toThrow();
      });

      it('should throw when no client is selected for a mechanic-bearing template', () => {
        const schema = createMechanicSchema('client_abc123');
        expect(() => service.validateSchema(schema, new Map(), null)).toThrow(
          /Mechanic-bearing templates require a client to be selected/,
        );
      });

      it('should throw when mechanic client mismatches the template client', () => {
        const schema = createMechanicSchema('client_abc123');
        expect(() => service.validateSchema(schema, new Map(), 'client_xyz789')).toThrow(
          /does not match template client "client_xyz789"/,
        );
      });
    });
  });

  describe('createTemplateWithSnapshot', () => {
    it('includes the client relation so the response reflects a binding made at create time', async () => {
      repository.create.mockResolvedValue({ uid: 'ttpl_1' } as any);

      await service.createTemplateWithSnapshot({
        name: 'Template',
        taskType: 'SETUP',
        currentSchema: {
          metadata: { task_type: 'SETUP' },
          items: [
            { id: 'item_1', key: 'simple_check', type: 'checkbox', label: 'Simple Check', required: true },
          ],
        },
        studioId: 'std_1',
        clientUid: 'client_1',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ client: { connect: { uid: 'client_1' } } }),
        { client: true },
      );
    });
  });

  describe('updateTemplateWithSnapshot', () => {
    it('includes the client relation so a binding-only update (no schema change) reflects in the response', async () => {
      repository.findOne.mockResolvedValue({ uid: 'ttpl_1', currentSchema: { items: [] } } as any);
      repository.update.mockResolvedValue({ uid: 'ttpl_1' } as any);

      await service.updateTemplateWithSnapshot('ttpl_1', 'std_1', {
        version: 1,
        clientUid: 'client_1',
      });

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'ttpl_1' }),
        expect.objectContaining({ client: { connect: { uid: 'client_1' } } }),
        { client: true },
      );
    });

    it('disconnects the client and still includes the relation when explicitly unbinding', async () => {
      repository.findOne.mockResolvedValue({ uid: 'ttpl_1', currentSchema: { items: [] } } as any);
      repository.update.mockResolvedValue({ uid: 'ttpl_1' } as any);

      await service.updateTemplateWithSnapshot('ttpl_1', 'std_1', {
        version: 1,
        clientUid: null,
      });

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'ttpl_1' }),
        expect.objectContaining({ client: { disconnect: true } }),
        { client: true },
      );
    });
  });
});
