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

  it('accepts hydrated per-target keys when a system_fact_key is bound', () => {
    const schema = TemplateSchemaV2Validator.parse({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_attendmiss1',
          key: 'attendance_missing',
          type: 'checkbox',
          label: 'Creator attendance missing',
          required: false,
          system_fact_key: 'creator_attendance_missing',
          validation: { require_reason: 'on-true' },
        },
      ],
    });

    const hydrationContext = {
      creators: [
        { uid: 'show_mc_alpha', label: 'Alice' },
        { uid: 'show_mc_beta', label: 'Bob' },
      ],
      platforms: [],
    };

    expect(() => service.validateContent({
      'fld_attendmiss1:creator:show_mc_alpha': false,
      'fld_attendmiss1:creator:show_mc_beta': false,
    }, schema as any, hydrationContext)).not.toThrow();
  });

  it('requires reason on hydrated checkbox when require_reason is on-true and value is true', () => {
    const schema = TemplateSchemaV2Validator.parse({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_attendmiss1',
          key: 'attendance_missing',
          type: 'checkbox',
          label: 'Creator attendance missing',
          required: false,
          system_fact_key: 'creator_attendance_missing',
          validation: { require_reason: 'on-true' },
        },
      ],
    });

    const hydrationContext = {
      creators: [{ uid: 'show_mc_alpha', label: 'Alice' }],
      platforms: [],
    };

    expect(() => service.validateContent({
      'fld_attendmiss1:creator:show_mc_alpha': true,
    }, schema as any, hydrationContext)).toThrow(TaskValidationError);

    expect(() => service.validateContent({
      'fld_attendmiss1:creator:show_mc_alpha': true,
      [getTaskContentReasonKey('fld_attendmiss1:creator:show_mc_alpha')]: 'Missed call sheet.',
    }, schema as any, hydrationContext)).not.toThrow();
  });

  it('tolerates stale hydrated keys (target no longer assigned) without requiring reason', () => {
    const schema = TemplateSchemaV2Validator.parse({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_attendmiss1',
          key: 'attendance_missing',
          type: 'checkbox',
          label: 'Creator attendance missing',
          required: false,
          system_fact_key: 'creator_attendance_missing',
          validation: { require_reason: 'on-true' },
        },
      ],
    });

    // Alpha was assigned at submission time and answered true; bob was later removed
    // and his previously-recorded value should pass through without a reason.
    const hydrationContext = {
      creators: [{ uid: 'show_mc_alpha', label: 'Alice' }],
      platforms: [],
    };

    expect(() => service.validateContent({
      'fld_attendmiss1:creator:show_mc_alpha': true,
      [getTaskContentReasonKey('fld_attendmiss1:creator:show_mc_alpha')]: 'Late callout.',
      // Real nanoid UID format: mixed-case letters, digits, underscores, hyphens.
      'fld_attendmiss1:creator:show_mc_OUvOf4_aKnD-8Q_HULeH': true,
    }, schema as any, hydrationContext)).not.toThrow();
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
