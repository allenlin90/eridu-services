import {
  getFieldReportDescriptor,
} from '@eridu/api-types/task-management';

const V1 = {}; // absent engine metadata = implicit v1
const V2 = { schema_engine: 'task_template_v2' };
const UID = 'ttpl_abc123';

describe('getFieldReportDescriptor', () => {
  describe('v1', () => {
    it('standard field uses bare key', () => {
      expect(getFieldReportDescriptor(V1, UID, { key: 'gmv', standard: true })).toBe('gmv');
    });

    it('custom field uses templateUid:key', () => {
      expect(getFieldReportDescriptor(V1, UID, { key: 'notes', standard: false })).toBe(`${UID}:notes`);
    });

    it('field with no standard property treated as custom', () => {
      expect(getFieldReportDescriptor(V1, UID, { key: 'notes' })).toBe(`${UID}:notes`);
    });
  });

  describe('v2 - shared fields', () => {
    it('canonicalized shared loop field: appends group suffix', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'gmv', shared_field_key: 'gmv', group: 'l1' })).toBe('gmv_l1');
    });

    it('canonicalized shared loop field: multi-digit group', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'gmv', shared_field_key: 'gmv', group: 'l11' })).toBe('gmv_l11');
    });

    it('legacy-suffix guard: shared_field_key already ends with _group — no double-suffix', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'gmv_l1', shared_field_key: 'gmv_l1', group: 'l1' })).toBe('gmv_l1');
    });

    it('legacy-suffix guard: multi-digit group does not double-suffix', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'gmv_l11', shared_field_key: 'gmv_l11', group: 'l11' })).toBe('gmv_l11');
    });

    it('legacy-suffix with different group: guard does not fire, suffix is appended', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'gmv_l1', shared_field_key: 'gmv_l1', group: 'l2' })).toBe('gmv_l1_l2');
    });

    it('shared non-loop field: uses shared_field_key verbatim', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'session_review_feedback', shared_field_key: 'session_review_feedback' })).toBe('session_review_feedback');
    });
  });

  describe('v2 - template-local fields', () => {
    it('local loop field: templateUid:group:key', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'notes', group: 'l1' })).toBe(`${UID}:l1:notes`);
    });

    it('local non-loop field: templateUid:key', () => {
      expect(getFieldReportDescriptor(V2, UID, { key: 'summary' })).toBe(`${UID}:summary`);
    });
  });
});
