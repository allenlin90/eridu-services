import { describe, expect, it } from 'vitest';

import { getUserInitials } from '../nav-user';

describe('getUserInitials', () => {
  it('returns first 2 characters for single name', () => {
    expect(getUserInitials('John')).toBe('JO');
    expect(getUserInitials('a')).toBe('A');
    expect(getUserInitials('Ab')).toBe('AB');
  });

  it('returns first character of first and last name for multiple names', () => {
    expect(getUserInitials('John Doe')).toBe('JD');
    expect(getUserInitials('Jane Smith Johnson')).toBe('JJ');
    expect(getUserInitials('A B')).toBe('AB');
  });

  it('handles empty string', () => {
    expect(getUserInitials('')).toBe('U');
  });

  it('handles whitespace-only string', () => {
    expect(getUserInitials('   ')).toBe('U');
  });

  it('handles names with extra whitespace', () => {
    expect(getUserInitials('  John   Doe  ')).toBe('JD');
    expect(getUserInitials('John   Doe')).toBe('JD');
  });

  it('converts to uppercase', () => {
    expect(getUserInitials('john doe')).toBe('JD');
    expect(getUserInitials('JOHN DOE')).toBe('JD');
  });

  it('handles single character names', () => {
    expect(getUserInitials('A B C')).toBe('AC');
    expect(getUserInitials('X')).toBe('X');
  });
});
