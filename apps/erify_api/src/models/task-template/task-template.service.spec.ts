import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('taskTemplateService', () => {
  let service: TaskTemplateService;
  let _repository: TaskTemplateRepository;
  let _utilityService: UtilityService;

  beforeEach(async () => {
    const repositoryMock = createMockRepository<TaskTemplateRepository>();
    const utilityMock = createMockUtilityService('ttpl_test123');

    const module = await createModelServiceTestModule({
      serviceClass: TaskTemplateService,
      repositoryClass: TaskTemplateRepository,
      repositoryMock,
      utilityMock,
    });

    service = module.get<TaskTemplateService>(TaskTemplateService);
    _repository = module.get<TaskTemplateRepository>(TaskTemplateRepository);
    _utilityService = module.get<UtilityService>(UtilityService);
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
  });
});
