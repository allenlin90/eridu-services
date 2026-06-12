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
 * The four `run-review/*` endpoints declare `@ZodPaginatedResponse(rowSchema)`,
 * which applies `ZodSerializerDto` and therefore validates + strips the response
 * at runtime. These tests pin that each row schema accepts the exact shape its
 * orchestration derive-method emits — so the serializer drops nothing the
 * frontend relies on. Representative rows mirror `deriveCreatorExceptions`,
 * `deriveViolations`, `deriveIncompleteTasks`, and `buildShowsRangeRows`.
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
});
