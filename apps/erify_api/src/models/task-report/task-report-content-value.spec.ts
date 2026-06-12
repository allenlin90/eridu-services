import type { FieldItem } from '@eridu/api-types/task-management';
import {
  getTaskContentExtraKey,
  getTaskContentReasonKey,
} from '@eridu/api-types/task-management';

import { projectTaskReportContentInput } from './task-report-content-value';

/**
 * Characterization spec for projectTaskReportContentInput (WI-T3).
 *
 * Pins the CURRENT behavior of the public projection so the planned
 * normalization fixes (WI-34 / decisions D9, D13) are deliberate contract
 * changes visible in a diff, not silent regressions. Cases that document a
 * known smell rather than intended behavior are called out inline; those
 * assertions are expected to flip when the corresponding fix lands.
 *
 * Tests drive only the exported function — normalizeFieldValue and
 * formatInputExtra are internal and intentionally not reached directly.
 */

type FieldType = FieldItem['type'];

const KEY = 'gmv';

function valueOf(raw: unknown, type: FieldType): unknown {
  return projectTaskReportContentInput({ [KEY]: raw }, { key: KEY, type }).value;
}

function extraOf(contentRecord: Record<string, unknown>): string | null {
  // The field type is irrelevant to extra formatting; use a string-like type.
  return projectTaskReportContentInput(contentRecord, { key: KEY, type: 'text' }).extra;
}

describe('projectTaskReportContentInput', () => {
  describe('value — null / missing', () => {
    it('returns null when the field key is absent from the content record', () => {
      expect(projectTaskReportContentInput({}, { key: KEY, type: 'number' }).value).toBeNull();
    });

    it('returns null for an explicit null value', () => {
      expect(valueOf(null, 'number')).toBeNull();
    });

    it('returns null for an explicit undefined value', () => {
      expect(valueOf(undefined, 'number')).toBeNull();
    });
  });

  describe('value — number', () => {
    it('passes a finite number through unchanged', () => {
      expect(valueOf(5, 'number')).toBe(5);
      expect(valueOf(0, 'number')).toBe(0);
      expect(valueOf(-2.5, 'number')).toBe(-2.5);
    });

    it('maps a non-finite number to null', () => {
      expect(valueOf(Number.POSITIVE_INFINITY, 'number')).toBeNull();
      expect(valueOf(Number.NaN, 'number')).toBeNull();
    });

    it('coerces a numeric string to a number', () => {
      expect(valueOf('5', 'number')).toBe(5);
      expect(valueOf('1.5', 'number')).toBe(1.5);
    });

    it('maps a non-numeric string to null', () => {
      expect(valueOf('abc', 'number')).toBeNull();
    });

    // CURRENT BEHAVIOR — known smell (C2 / WI-34 / D9).
    // A submitted-but-blank numeric field is coerced to 0 (Number('') === 0),
    // fabricating "0" instead of "not reported". WI-34 will flip these to null.
    describe('blank string (current behavior — WI-34/D9 will change 0 → null)', () => {
      it('coerces an empty string to 0', () => {
        expect(valueOf('', 'number')).toBe(0);
      });

      it('coerces a whitespace-only string to 0', () => {
        expect(valueOf('   ', 'number')).toBe(0);
      });
    });
  });

  describe('value — checkbox', () => {
    it('passes a boolean through unchanged', () => {
      expect(valueOf(true, 'checkbox')).toBe(true);
      expect(valueOf(false, 'checkbox')).toBe(false);
    });

    it('treats the case-insensitive string "true" as true', () => {
      expect(valueOf('true', 'checkbox')).toBe(true);
      expect(valueOf('TRUE', 'checkbox')).toBe(true);
    });

    it('treats any other string as false', () => {
      expect(valueOf('false', 'checkbox')).toBe(false);
      expect(valueOf('yes', 'checkbox')).toBe(false);
    });

    // CURRENT BEHAVIOR — known smell (D13): only the literal string 'true' is
    // truthy. Numeric 1 / '1' do NOT map to true (String(1) !== 'true').
    it('does not treat numeric-truthy values as true (current behavior — D13)', () => {
      expect(valueOf(1, 'checkbox')).toBe(false);
      expect(valueOf('1', 'checkbox')).toBe(false);
    });
  });

  describe('value — multiselect', () => {
    it('maps an array to an array of strings', () => {
      expect(valueOf(['a', 1, true], 'multiselect')).toEqual(['a', '1', 'true']);
    });

    it('preserves an empty array', () => {
      expect(valueOf([], 'multiselect')).toEqual([]);
    });

    // CURRENT BEHAVIOR — known smell (D13): a non-array value is dropped to
    // null rather than wrapped, silently discarding a single-value answer.
    it('drops a non-array value to null (current behavior — D13)', () => {
      expect(valueOf('a', 'multiselect')).toBeNull();
      expect(valueOf({ not: 'array' }, 'multiselect')).toBeNull();
    });
  });

  describe('value — string-like types', () => {
    it.each(['text', 'textarea', 'select', 'date', 'datetime', 'file', 'url'] as const)(
      'stringifies the value for type "%s"',
      (type) => {
        expect(valueOf('hello', type)).toBe('hello');
        expect(valueOf(5, type)).toBe('5');
        expect(valueOf(true, type)).toBe('true');
      },
    );
  });

  describe('extra — reason and extra formatting', () => {
    it('returns null when neither reason nor extra is present', () => {
      expect(extraOf({ [KEY]: 'irrelevant' })).toBeNull();
    });

    it('formats a non-blank reason as an Explanation line', () => {
      expect(extraOf({ [getTaskContentReasonKey(KEY)]: 'arrived late' })).toBe(
        'Explanation: arrived late',
      );
    });

    it('omits a blank reason', () => {
      expect(extraOf({ [getTaskContentReasonKey(KEY)]: '   ' })).toBeNull();
      expect(extraOf({ [getTaskContentReasonKey(KEY)]: '' })).toBeNull();
    });

    it('humanizes extra keys and skips blank extra values', () => {
      const record = {
        [getTaskContentExtraKey(KEY)]: {
          lateMinutes: 5,
          empty_value: '',
        },
      };

      expect(extraOf(record)).toBe('Late Minutes: 5');
    });

    it('stringifies booleans, arrays, and objects in extra values', () => {
      const record = {
        [getTaskContentExtraKey(KEY)]: {
          flagged: true,
          tags: ['a', 'b'],
          payload: { x: 1 },
        },
      };

      expect(extraOf(record)).toBe('Flagged: Yes\nTags: a; b\nPayload: {"x":1}');
    });

    it('orders the reason line before extra entries, joined by newlines', () => {
      const record = {
        [getTaskContentReasonKey(KEY)]: 'because',
        [getTaskContentExtraKey(KEY)]: {
          note: 'follow up',
        },
      };

      expect(extraOf(record)).toBe('Explanation: because\nNote: follow up');
    });
  });
});
