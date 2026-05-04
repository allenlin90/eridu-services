import { describe, expect, it } from 'vitest';

import { createDefaultBuilderTemplate, hasTemplateSchemaEngineMismatch, shouldUseSavedBuilderDraft } from '../payload';

describe('createDefaultBuilderTemplate', () => {
  it('returns a v2 envelope by default', () => {
    const tpl = createDefaultBuilderTemplate();
    expect(tpl).toMatchObject({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      task_type: 'SETUP',
      items: [],
    });
  });
});

describe('shouldUseSavedBuilderDraft', () => {
  it('accepts a v2 draft', () => {
    const v2Draft = { schema_engine: 'task_template_v2', name: 'draft' };
    expect(shouldUseSavedBuilderDraft(v2Draft)).toBe(true);
  });

  it('accepts a v1 draft', () => {
    const v1Draft = { name: 'draft', items: [] };
    expect(shouldUseSavedBuilderDraft(v1Draft)).toBe(true);
  });

  it('rejects null', () => {
    expect(shouldUseSavedBuilderDraft(null)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(shouldUseSavedBuilderDraft('string')).toBe(false);
    expect(shouldUseSavedBuilderDraft(42)).toBe(false);
  });
});

describe('hasTemplateSchemaEngineMismatch', () => {
  it('returns false when both schemas are v1', () => {
    const v1 = { items: [] };
    expect(hasTemplateSchemaEngineMismatch(v1, v1)).toBe(false);
  });

  it('returns false when both schemas are v2', () => {
    const v2 = { schema_version: 2, schema_engine: 'task_template_v2', items: [] };
    expect(hasTemplateSchemaEngineMismatch(v2, v2)).toBe(false);
  });

  it('returns true when local is v1 and server is v2', () => {
    const v1 = { items: [] };
    const v2 = { schema_version: 2, schema_engine: 'task_template_v2', items: [] };
    expect(hasTemplateSchemaEngineMismatch(v1, v2)).toBe(true);
  });

  it('returns true when either schema has an unsupported engine', () => {
    const unsupported = { schema_version: 99, schema_engine: 'task_template_v99', items: [] };
    const v1 = { items: [] };
    expect(hasTemplateSchemaEngineMismatch(unsupported, v1)).toBe(true);
  });
});
