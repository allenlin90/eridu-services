import { describe, expect, it } from 'vitest';

import { getExtractionStatus } from '../extraction-warnings';

describe('getExtractionStatus', () => {
  it('returns no bindings and zero facts if schema is null or invalid', () => {
    expect(getExtractionStatus(null, {})).toEqual({
      hasBindings: false,
      willExtractZeroFacts: true,
    });
    expect(getExtractionStatus({}, {})).toEqual({
      hasBindings: false,
      willExtractZeroFacts: true,
    });
    expect(getExtractionStatus({ items: 'not-an-array' }, {})).toEqual({
      hasBindings: false,
      willExtractZeroFacts: true,
    });
  });

  it('returns hasBindings: false when no items have system_fact_key', () => {
    const schema = {
      items: [
        { id: 'field_1', label: 'Field 1' },
        { id: 'field_2', label: 'Field 2' },
      ],
    };
    expect(getExtractionStatus(schema, { field_1: 'value' })).toEqual({
      hasBindings: false,
      willExtractZeroFacts: true,
    });
  });

  it('returns hasBindings: true and willExtractZeroFacts: true when bound fields exist but are empty in content', () => {
    const schema = {
      items: [
        { id: 'field_1', label: 'Field 1', system_fact_key: 'fact_1' },
        { id: 'field_2', label: 'Field 2' },
      ],
    };
    expect(getExtractionStatus(schema, {})).toEqual({
      hasBindings: true,
      willExtractZeroFacts: true,
    });
    expect(getExtractionStatus(schema, { field_1: '', field_2: 'some-value' })).toEqual({
      hasBindings: true,
      willExtractZeroFacts: true,
    });
    expect(getExtractionStatus(schema, { field_1: null, field_1_other: 'val' })).toEqual({
      hasBindings: true,
      willExtractZeroFacts: true,
    });
    expect(getExtractionStatus(schema, { field_1: undefined })).toEqual({
      hasBindings: true,
      willExtractZeroFacts: true,
    });
  });

  it('returns hasBindings: true and willExtractZeroFacts: false when at least one bound field has a non-empty value', () => {
    const schema = {
      items: [
        { id: 'field_1', label: 'Field 1', system_fact_key: 'fact_1' },
        { id: 'field_2', label: 'Field 2' },
      ],
    };
    expect(getExtractionStatus(schema, { field_1: 'hello' })).toEqual({
      hasBindings: true,
      willExtractZeroFacts: false,
    });
    expect(getExtractionStatus(schema, { 'field_1:platform:platform_123': 'active' })).toEqual({
      hasBindings: true,
      willExtractZeroFacts: false,
    });
  });
});
