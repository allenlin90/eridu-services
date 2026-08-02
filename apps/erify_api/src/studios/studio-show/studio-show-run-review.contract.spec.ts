import { showIssueApiResponseSchema } from '@eridu/api-types/show-issues';
import {
  showRunReviewCreatorExceptionSchema,
  showRunReviewIncompleteTaskSchema,
  showRunReviewShowsRangeRowSchema,
  showRunReviewViolationSchema,
} from '@eridu/api-types/shows';

import { createPaginatedResponseSchema } from '@/lib/pagination/pagination.schema';

/**
 * Contract characterization for the paginated run-review sub-resources.
 *
 * These endpoints declare `@ZodPaginatedResponse(rowSchema)`, which applies
 * `ZodSerializerDto` and therefore validates + strips the response at
 * runtime. These tests pin that each row schema accepts the exact shape its
 * orchestration method emits — so the serializer drops nothing the frontend
 * relies on. Representative rows mirror `deriveCreatorExceptions`,
 * `deriveViolations`, `deriveIncompleteTasks`, `buildShowsRangeRows`, and
 * (for issues) `toShowIssueApiResponse`.
 */

const meta = {
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function expectRoundTrip<T extends import('zod').ZodType>(rowSchema: T, row: unknown) {
  const envelope = createPaginatedResponseSchema(rowSchema);
  const parsed = envelope.parse({ data: [row], meta });
  // No field stripped, no coercion: the serialized row equals the input row.
  expect(parsed.data[0]).toEqual(row);
}

describe('run-review paginated response contracts', () => {
  it('creators: keeps every creator-exception field (incl. nullable reason)', () => {
    expectRoundTrip(showRunReviewCreatorExceptionSchema, {
      show_creator_uid: 'show_creator_abc',
      creator_name: 'Jane Doe',
      show_name: 'Morning Show',
      show_start_time: '2026-06-01T09:00:00.000Z',
      status: 'LATE',
      late_minutes: 12,
      reason: 'Joined 12 minutes late',
    });

    expectRoundTrip(showRunReviewCreatorExceptionSchema, {
      show_creator_uid: 'show_creator_def',
      creator_name: 'No Show',
      show_name: 'Evening Show',
      show_start_time: '2026-06-01T18:00:00.000Z',
      status: 'MISSING',
      late_minutes: 0,
      reason: null,
    });
  });

  it('violations: keeps every violation field', () => {
    expectRoundTrip(showRunReviewViolationSchema, {
      violation_uid: 'violation_abc',
      platform_name: 'TikTok',
      show_name: 'Morning Show',
      show_start_time: '2026-06-01T09:00:00.000Z',
      violation_type: 'COPYRIGHT',
      severity: 'HIGH',
      reason: 'Background music flagged',
      observed_at: '2026-06-01T09:15:00.000Z',
    });
  });

  it('tasks: keeps every incomplete-task field', () => {
    expectRoundTrip(showRunReviewIncompleteTaskSchema, {
      task_uid: 'task_abc',
      description: 'Upload closing proof',
      status: 'PENDING',
      type: 'CLOSURE',
      show_name: 'Morning Show',
    });
  });

  it('shows: keeps every shows-range-row field', () => {
    expectRoundTrip(showRunReviewShowsRangeRowSchema, {
      id: 'shows-range-summary',
      shows_range: 'Shows scheduled within range: 3 scheduled',
      actuals_completeness: '2 started, 1 not started · 1 late (30m lost)',
      status: 'MISSING STARTS',
    });
  });

  it('issues: keeps every show-issue field (the canonical response shape, reused verbatim)', () => {
    expectRoundTrip(showIssueApiResponseSchema, {
      id: 'issue_abc',
      show_id: 'show_abc',
      category: 'EQUIPMENT',
      origin: 'MANUAL',
      severity: 'HIGH',
      status: 'OPEN',
      title: 'Broken mic',
      evidence: null,
      owner: null,
      due_at: null,
      created_by: { uid: 'user_abc', name: 'Manager' },
      escalation_level: 0,
      escalated_at: null,
      escalated_by: null,
      escalation_note: null,
      resolved_at: null,
      resolved_by: null,
      resolution_code: null,
      resolution_note: null,
      show_creator_id: null,
      show_platform_violation_id: null,
      version: 1,
      created_at: '2026-06-01T09:00:00.000Z',
      updated_at: '2026-06-01T09:00:00.000Z',
    });
  });
});
