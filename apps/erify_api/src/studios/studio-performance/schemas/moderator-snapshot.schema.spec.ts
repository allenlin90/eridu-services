import {
  parseModeratorSnapshot,
  parseTaskContent,
} from './moderator-snapshot.schema';

describe('parseModeratorSnapshot', () => {
  it('extracts a well-formed items array and loops list', () => {
    const result = parseModeratorSnapshot({
      items: [
        { id: 'fld_gmv_l1', key: 'gmv', group: 'l1', system_fact_key: 'show_platform_gmv' },
      ],
      metadata: { loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });

    expect(result.items).toEqual([
      { id: 'fld_gmv_l1', key: 'gmv', group: 'l1', system_fact_key: 'show_platform_gmv' },
    ]);
    expect(result.loops).toEqual([{ id: 'l1', name: 'Loop 1', durationMin: 15 }]);
  });

  it('reads items and loops independently — a junk items value keeps a valid loop list', () => {
    // Mirrors the service-level "malformed snapshot" characterization: a
    // non-array `items` must not drop the loop list.
    const result = parseModeratorSnapshot({
      items: { junk: true },
      metadata: { loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });

    expect(result.items).toEqual([]);
    expect(result.loops).toEqual([{ id: 'l1', name: 'Loop 1', durationMin: 15 }]);
  });

  it('returns loops=null when metadata.loops is absent or not an array (the gate)', () => {
    expect(parseModeratorSnapshot({ items: [] }).loops).toBeNull();
    expect(parseModeratorSnapshot({ metadata: {} }).loops).toBeNull();
    expect(parseModeratorSnapshot({ metadata: { loops: 'nope' } }).loops).toBeNull();
    expect(parseModeratorSnapshot(null).loops).toBeNull();
  });

  it('preserves an empty (but present) loops array as a match, distinct from null', () => {
    expect(parseModeratorSnapshot({ metadata: { loops: [] } }).loops).toEqual([]);
  });

  it('keeps legacy items without shared_field_key / system_fact_key', () => {
    const result = parseModeratorSnapshot({
      items: [{ id: 'fld_gmv_l1', key: 'gmv_l1', group: 'l1' }],
      metadata: { loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });
    expect(result.items[0]).toEqual({ id: 'fld_gmv_l1', key: 'gmv_l1', group: 'l1' });
  });

  it('drops a malformed individual item to {} without losing its siblings', () => {
    const result = parseModeratorSnapshot({
      items: [
        { id: 'fld_ok', group: 'l1', key: 'gmv' },
        { id: 123 }, // non-string id → dropped to {}
      ],
      metadata: { loops: [{ id: 'l1', name: 'L1' }] },
    });
    expect(result.items).toEqual([{ id: 'fld_ok', group: 'l1', key: 'gmv' }, {}]);
  });

  it('drops loop entries missing the string id/name the response contract requires', () => {
    const result = parseModeratorSnapshot({
      items: [],
      metadata: { loops: [{ id: 'l1', name: 'Loop 1' }, { id: 'l2' }] },
    });
    expect(result.loops).toEqual([{ id: 'l1', name: 'Loop 1' }]);
  });
});

describe('parseTaskContent', () => {
  it('returns the content map for an object', () => {
    expect(parseTaskContent({ fld_gmv_l1: '100' })).toEqual({ fld_gmv_l1: '100' });
  });

  it('returns an empty map for null / undefined / non-object content', () => {
    expect(parseTaskContent(null)).toEqual({});
    expect(parseTaskContent(undefined)).toEqual({});
    expect(parseTaskContent('nope')).toEqual({});
  });
});
