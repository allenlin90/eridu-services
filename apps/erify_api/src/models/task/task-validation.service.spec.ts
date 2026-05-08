import { getTaskContentExtraKey, getTaskContentReasonKey, TemplateSchemaValidator } from '@eridu/api-types/task-management';

import { TaskValidationService } from './task-validation.service';

import { TaskValidationError } from '@/lib/errors/task-validation.error';

describe('taskValidationService', () => {
  const service = new TaskValidationService();

  it('accepts reason and extra sidecars for template fields', () => {
    const schema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_setup_status',
          key: 'setup_status',
          type: 'select',
          label: 'Setup status',
          required: true,
          options: [
            { value: 'correct', label: 'Correct' },
            { value: 'not_correct', label: 'Not correct' },
          ],
          validation: {
            require_reason: [{ op: 'neq', value: 'correct' }],
          },
        },
      ],
    });

    expect(() => service.validateContent({
      setup_status: 'not_correct',
      [getTaskContentReasonKey('setup_status')]: 'Scene was not configured.',
      [getTaskContentExtraKey('setup_status')]: { cause: 'Wrong profile loaded' },
    }, schema)).not.toThrow();
  });

  it('still rejects unrelated content keys', () => {
    const schema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_setup_status',
          key: 'setup_status',
          type: 'text',
          label: 'Setup status',
          required: true,
        },
      ],
    });

    expect(() => service.validateContent({
      setup_status: 'Ready',
      unrelated_reason: 'Should not be accepted',
    }, schema)).toThrow(TaskValidationError);
  });
});
