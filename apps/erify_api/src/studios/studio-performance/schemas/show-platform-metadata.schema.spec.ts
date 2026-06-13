import { parsePerformanceTemplates } from './show-platform-metadata.schema';

describe('parsePerformanceTemplates', () => {
  it('extracts a well-formed performance_templates map', () => {
    const templates = parsePerformanceTemplates({
      performance_templates: {
        show_platform_gmv: 'ttpl_post_prod',
        show_platform_view_count: 'ttpl_post_prod',
      },
    });

    expect(templates.show_platform_view_count).toBe('ttpl_post_prod');
    expect(templates.show_platform_gmv).toBe('ttpl_post_prod');
  });

  it('returns an empty map when metadata has no performance_templates', () => {
    expect(parsePerformanceTemplates({ other: true })).toEqual({});
  });

  it('returns an empty map for null / non-object metadata (no throw)', () => {
    expect(parsePerformanceTemplates(null)).toEqual({});
    expect(parsePerformanceTemplates(undefined)).toEqual({});
    expect(parsePerformanceTemplates('nope')).toEqual({});
  });

  it('returns an empty map when performance_templates is not an object', () => {
    expect(parsePerformanceTemplates({ performance_templates: 'nope' })).toEqual({});
  });

  it('treats an absent view-count key as not-recorded (undefined)', () => {
    const templates = parsePerformanceTemplates({
      performance_templates: { show_platform_gmv: 'ttpl' },
    });
    expect(templates.show_platform_view_count).toBeUndefined();
  });
});
