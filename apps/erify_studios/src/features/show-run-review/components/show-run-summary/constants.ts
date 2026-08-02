/** Fixed page size for every Show Run Review sub-resource list / export. */
export const SHOW_RUN_REVIEW_PAGE_SIZE = 10;

/**
 * Batch size for exporting the full filtered issues set. Must match the
 * backend's `limit` cap on `GET /studios/:studioId/shows/run-review/issues`
 * (`SHOW_RUN_REVIEW_ISSUES_MAX_PAGE_SIZE` in `studio-show.controller.ts`) —
 * unlike the other four run-review sub-resources, that endpoint pages
 * PostgreSQL directly rather than slicing an in-memory show graph, so a
 * single `limit: total` export call is rejected once total exceeds the cap.
 */
export const SHOW_RUN_REVIEW_ISSUES_EXPORT_PAGE_SIZE = 100;
