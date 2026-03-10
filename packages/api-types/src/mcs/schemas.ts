/**
 * Legacy MC aliases for creator schemas/types.
 * Prefer importing from `@eridu/api-types/creators`.
 */

export {
  type CreateCreatorInput as CreateMcInput,
  createCreatorInputSchema as createMcInputSchema,
  CREATOR_COMPENSATION_TYPE as MC_COMPENSATION_TYPE,
  type CreatorApiResponse as McApiResponse,
  creatorApiResponseSchema as mcApiResponseSchema,
  type CreatorCompensationType as McCompensationType,
  type UpdateCreatorInput as UpdateMcInput,
  updateCreatorInputSchema as updateMcInputSchema,
} from '../creators/schemas.js';
