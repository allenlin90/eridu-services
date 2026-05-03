import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hasTemplateSchemaEngineMismatch, shouldUseSavedBuilderDraft } from '../payload';

describe('shouldUseSavedBuilderDraft', () => {
  const originalFlag = import.meta.env.VITE_TASK_TEMPLATE_V2_BUILDER;

  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_TASK_TEMPLATE_V2_BUILDER = 'false';
  });

  afterEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_TASK_TEMPLATE_V2_BUILDER = originalFlag;
  });

  it('rejects a v2 draft when the v2 flag is disabled', () => {
    const v2Draft = { schema_engine: 'task_template_v2', name: 'draft' };
    expect(shouldUseSavedBuilderDraft(v2Draft)).toBe(false);
  });

  it('accepts a v2 draft when the v2 flag is enabled', () => {
    (import.meta.env as Record<string, string | undefined>).VITE_TASK_TEMPLATE_V2_BUILDER = 'true';
    const v2Draft = { schema_engine: 'task_template_v2', name: 'draft' };
    expect(shouldUseSavedBuilderDraft(v2Draft)).toBe(true);
  });

  it('accepts a v1 draft regardless of the flag', () => {
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
