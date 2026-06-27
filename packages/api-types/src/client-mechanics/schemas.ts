import { z } from 'zod';

/**
 * Lifecycle status for a client mechanic.
 *
 * `active` mechanics are assignable into task-template loops; `retired`
 * mechanics are kept for history and coverage but hidden from new assignment.
 * Retire is reversible (a retired mechanic can be reactivated); it is distinct
 * from soft-delete.
 */
export const MECHANIC_STATUS = {
  ACTIVE: 'active',
  RETIRED: 'retired',
} as const;

export type MechanicStatus = (typeof MECHANIC_STATUS)[keyof typeof MECHANIC_STATUS];

const mechanicStatusSchema = z.enum(
  Object.values(MECHANIC_STATUS) as [MechanicStatus, ...MechanicStatus[]],
);

/**
 * Client Mechanic API Response Schema (snake_case — matches backend API output).
 *
 * `content_revision` is a monotonic integer bumped only when the moderator-facing
 * instruction (`instruction_label` / `instruction_body`) changes; it is frozen
 * into template snapshots for staleness comparison. `version` is the
 * optimistic-lock token for concurrent edits.
 */
export const clientMechanicApiResponseSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  title: z.string(),
  instruction_label: z.string(),
  instruction_body: z.string(),
  status: mechanicStatusSchema,
  version: z.number().int(),
  content_revision: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Client Mechanic Input Schema.
 */
export const createClientMechanicInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  instruction_label: z.string().min(1, 'Instruction label is required'),
  instruction_body: z.string().min(1, 'Instruction body is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Client Mechanic Input Schema.
 *
 * `version` is required for optimistic-lock conflict detection. All content
 * fields are optional (partial update). `status` allows retire / reactivate via
 * PATCH in addition to the DELETE-as-retire shortcut.
 */
export const updateClientMechanicInputSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  instruction_label: z.string().min(1, 'Instruction label is required').optional(),
  instruction_body: z.string().min(1, 'Instruction body is required').optional(),
  status: mechanicStatusSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  version: z.number().int().nonnegative(),
});

/**
 * List filter for client mechanics (status / search). Pagination is layered on
 * the erify_api side via the shared pagination query schema.
 */
export const listClientMechanicsFilterSchema = z.object({
  search: z.string().optional(),
  status: mechanicStatusSchema.optional(),
});

export type ClientMechanicApiResponse = z.infer<typeof clientMechanicApiResponseSchema>;
export type CreateClientMechanicInput = z.infer<typeof createClientMechanicInputSchema>;
export type UpdateClientMechanicInput = z.infer<typeof updateClientMechanicInputSchema>;
export type ListClientMechanicsFilter = z.infer<typeof listClientMechanicsFilterSchema>;

/**
 * Date-range query for mechanic coverage analysis (ISO-8601 absolute datetime strings).
 */
export const listMechanicCoverageQuerySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

export type ListMechanicCoverageQuery = z.infer<typeof listMechanicCoverageQuerySchema>;

/**
 * Task template currently referencing a specific client mechanic.
 */
export const mechanicCoverageTemplateSchema = z.object({
  uid: z.string(),
  name: z.string(),
  is_latest_carrying: z.boolean(),
});

export type MechanicCoverageTemplate = z.infer<typeof mechanicCoverageTemplateSchema>;

/**
 * Coverage status of a specific client mechanic on a target show.
 */
export const mechanicCoverageShowSchema = z.object({
  uid: z.string(),
  name: z.string(),
  start_time: z.string(),
  status: z.enum(['current', 'stale', 'dropped']),
  task_uid: z.string().nullable(),
  template_uid: z.string().nullable(),
  template_name: z.string().nullable(),
  frozen_revision: z.number().int().nullable(),
  catalog_revision: z.number().int(),
});

export type MechanicCoverageShow = z.infer<typeof mechanicCoverageShowSchema>;

/**
 * API response detailing a client mechanic's template and show coverage.
 */
export const clientMechanicCoverageResponseSchema = z.object({
  templates: z.array(mechanicCoverageTemplateSchema),
  shows: z.array(mechanicCoverageShowSchema),
});

export type ClientMechanicCoverageResponse = z.infer<typeof clientMechanicCoverageResponseSchema>;

/**
 * Expected client mechanic details and coverage status on a specific show.
 */
export const showMechanicExpectedSchema = z.object({
  uid: z.string(),
  title: z.string(),
  instruction_label: z.string(),
  instruction_body: z.string(),
  status: z.enum(['current', 'stale', 'missing']),
  frozen_revision: z.number().int().nullable(),
  catalog_revision: z.number().int(),
  catalog_status: mechanicStatusSchema,
});

export type ShowMechanicExpected = z.infer<typeof showMechanicExpectedSchema>;

/**
 * API response detailing show-scoped mechanic coverage.
 */
export const showMechanicCoverageResponseSchema = z.object({
  show_uid: z.string(),
  show_name: z.string(),
  client_uid: z.string().nullable(),
  client_name: z.string().nullable(),
  task_uid: z.string().nullable(),
  template_uid: z.string().nullable(),
  template_name: z.string().nullable(),
  mechanics: z.array(showMechanicExpectedSchema),
});

export type ShowMechanicCoverageResponse = z.infer<typeof showMechanicCoverageResponseSchema>;
