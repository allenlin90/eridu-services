/**
 * Re-export shared types from @eridu/api-types
 * The frontend should use the Show type which is camelCase-friendly
 */
export type {
  CreatorCompensationSnapshot,
  CreatorEconomicsSummary,
  CreatorFinancialScope,
} from './types/financial-extension.types';
export type {
  Show,
  ShowApiResponse,
  showApiResponseToShow,
  ShowListResponse,
} from '@eridu/api-types/shows';
