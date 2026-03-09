import {
  type CreateMcInput,
  createMcInputSchema,
  MC_COMPENSATION_TYPE,
  type McApiResponse,
  mcApiResponseSchema,
  type UpdateMcInput,
  updateMcInputSchema,
} from '../mcs/schemas.js';

export const CREATOR_COMPENSATION_TYPE = MC_COMPENSATION_TYPE;

export type CreatorCompensationType = (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE];

export const creatorApiResponseSchema = mcApiResponseSchema;
export const createCreatorInputSchema = createMcInputSchema;
export const updateCreatorInputSchema = updateMcInputSchema;

export type CreatorApiResponse = McApiResponse;
export type CreateCreatorInput = CreateMcInput;
export type UpdateCreatorInput = UpdateMcInput;
