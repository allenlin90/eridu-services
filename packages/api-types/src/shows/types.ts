import type { z } from 'zod';

import type {
  createShowInputSchema,
  listShowsQuerySchema,
  showApiResponseSchema,
  showListResponseSchema,
  updateShowInputSchema,
} from './schemas.js';

/**
 * TypeScript types inferred from Zod schemas
 * These types match the API response format (snake_case)
 */

/**
 * Show API Response Type (snake_case - matches backend API output)
 */
export type ShowApiResponse = z.infer<typeof showApiResponseSchema>;

/**
 * Show List Response Type
 */
export type ShowListResponse = z.infer<typeof showListResponseSchema>;

/**
 * List Shows Query Parameters Type
 */
export type ListShowsQuery = z.infer<typeof listShowsQuerySchema>;

/**
 * Create Show Input Type (snake_case - matches API input)
 */
export type CreateShowInput = z.infer<typeof createShowInputSchema>;

/**
 * Update Show Input Type (snake_case - matches API input)
 */
export type UpdateShowInput = z.infer<typeof updateShowInputSchema>;

/**
 * Frontend-friendly Show type (snake_case to match API response)
 * This matches the API response format for frontend usage
 */
export type Show = {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  studio_room_id: string | null;
  studio_room_name: string | null;
  show_type_id: string | null;
  show_type_name: string | null;
  show_status_id: string | null;
  show_status_name: string | null;
  show_standard_id: string | null;
  show_standard_name: string | null;
  start_time: string; // ISO 8601 datetime string
  end_time: string; // ISO 8601 datetime string
  metadata: Record<string, any>;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
};

/**
 * Helper function to convert API response (snake_case) to frontend-friendly format (snake_case)
 * Since Show type now matches API format, this is essentially a type cast
 */
export function showApiResponseToShow(apiResponse: ShowApiResponse): Show {
  return {
    id: apiResponse.id,
    name: apiResponse.name,
    client_id: apiResponse.client_id,
    client_name: apiResponse.client_name,
    studio_room_id: apiResponse.studio_room_id,
    studio_room_name: apiResponse.studio_room_name,
    show_type_id: apiResponse.show_type_id,
    show_type_name: apiResponse.show_type_name,
    show_status_id: apiResponse.show_status_id,
    show_status_name: apiResponse.show_status_name,
    show_standard_id: apiResponse.show_standard_id,
    show_standard_name: apiResponse.show_standard_name,
    start_time: apiResponse.start_time,
    end_time: apiResponse.end_time,
    metadata: apiResponse.metadata,
    created_at: apiResponse.created_at,
    updated_at: apiResponse.updated_at,
  };
}

/**
 * Helper function to convert frontend-friendly format (snake_case) to API input (snake_case)
 */
export function showToCreateShowInput(show: Partial<Show>): Partial<CreateShowInput> {
  const input: Partial<CreateShowInput> = {};

  if (show.client_id !== undefined && show.client_id !== null)
    input.client_id = show.client_id;
  if (show.studio_room_id !== undefined && show.studio_room_id !== null)
    input.studio_room_id = show.studio_room_id;
  if (show.show_type_id !== undefined && show.show_type_id !== null)
    input.show_type_id = show.show_type_id;
  if (show.show_status_id !== undefined && show.show_status_id !== null)
    input.show_status_id = show.show_status_id;
  if (show.show_standard_id !== undefined && show.show_standard_id !== null)
    input.show_standard_id = show.show_standard_id;
  if (show.name !== undefined)
    input.name = show.name;
  if (show.start_time !== undefined)
    input.start_time = show.start_time;
  if (show.end_time !== undefined)
    input.end_time = show.end_time;
  if (show.metadata !== undefined)
    input.metadata = show.metadata;

  return input;
}
