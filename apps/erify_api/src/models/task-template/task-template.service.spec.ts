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
      expect(service.validateSchema(schema)).toBe(true);
    });

    it('should throw if key is not snake_case', () => {
      const schema = createValidSchema();
      schema.items[0].key = 'CamelCaseKey';

      expect(() => service.validateSchema(schema)).toThrow();
    });

    it('should throw if duplicate keys exist', () => {
      const schema = {
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

    describe('require_reason validation', () => {
      it('should pass for valid boolean require_reason', () => {
        const schema = {
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
        expect(service.validateSchema(schema)).toBe(true);
      });

      it('should throw if boolean require_reason used on number', () => {
        const schema = {
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
        expect(service.validateSchema(schema)).toBe(true);
      });

      it('should throw if numeric criteria require_reason used on checkbox', () => {
        const schema = {
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
