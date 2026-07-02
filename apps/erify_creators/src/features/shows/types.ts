/**
 * Re-export shared types from @eridu/api-types
 * The frontend should use the Show type, which matches the API's snake_case shape directly
 */
export type {
  Show,
  ShowApiResponse,
  showApiResponseToShow,
  ShowListResponse,
} from '@eridu/api-types/shows';
