import { describe, expect, it } from 'vitest';

import { toggleArrayValue } from '../array-utils';

describe('toggleArrayValue', () => {
  it('appends a value that is not present, at the end', () => {
    expect(toggleArrayValue(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('removes a value that is already present, preserving order of the rest', () => {
    expect(toggleArrayValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('adds the first value to an empty array', () => {
    expect(toggleArrayValue([], 'a')).toEqual(['a']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b'];
    toggleArrayValue(input, 'a');
    expect(input).toEqual(['a', 'b']);
  });
});
