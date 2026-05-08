import {
  getTaskContentExtraKey,
  getTaskContentReasonKey,
  TemplateSchemaV2Validator,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';

import { TaskValidationService } from './task-validation.service';

import { TaskValidationError } from '@/lib/errors/task-validation.error';

describe('taskValidationService', () => {
  const service = new TaskValidationService();
  const v2ReasonSchema = TemplateSchemaV2Validator.parse({
    schema_version: 2,
    schema_engine: 'task_template_v2',
    items: [
      {
        id: 'fld_setupstatus1',
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

  it('rejects v2 content when a triggered require_reason rule has no reason sidecar', () => {
    expect(() => service.validateContent({
      fld_setupstatus1: 'not_correct',
    }, v2ReasonSchema as any)).toThrow(TaskValidationError);

    try {
      service.validateContent({
        fld_setupstatus1: 'not_correct',
      }, v2ReasonSchema as any);
    } catch (error) {
      expect(error).toBeInstanceOf(TaskValidationError);
      expect((error as TaskValidationError).validationErrors).toContainEqual({
        field: getTaskContentReasonKey('fld_setupstatus1'),
        message: 'Explanation is required for "Setup status"',
      });
    }
  });

  it('rejects v2 content when a triggered require_reason rule has only whitespace', () => {
    expect(() => service.validateContent({
      fld_setupstatus1: 'not_correct',
      [getTaskContentReasonKey('fld_setupstatus1')]: '   ',
    }, v2ReasonSchema as any)).toThrow(TaskValidationError);
  });

  it('accepts v2 content when require_reason does not trigger or a reason is provided', () => {
    expect(() => service.validateContent({
      fld_setupstatus1: 'correct',
    }, v2ReasonSchema as any)).not.toThrow();

    expect(() => service.validateContent({
      fld_setupstatus1: 'not_correct',
      [getTaskContentReasonKey('fld_setupstatus1')]: 'Scene was not configured.',
    }, v2ReasonSchema as any)).not.toThrow();
  });

  it('does not enforce require_reason for v1 schemas', () => {
    const schema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_setup001',
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
    }, schema)).not.toThrow();
  });
});
