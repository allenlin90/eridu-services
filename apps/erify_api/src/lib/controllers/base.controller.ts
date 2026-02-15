import {
  createPaginationMeta,
  type PaginationQueryDto,
} from '@/lib/pagination/pagination.schema';

/**
 * Base controller for endpoints providing common functionality
 * such as pagination response creation and error handling.
 */
export abstract class BaseController {
  constructor() {}
  /**
   * Creates a paginated response with data and pagination metadata.
   *
   * @param data - Array of items to include in the response
   * @param total - Total count of items available
   * @param query - Pagination query parameters
   * @returns Object containing data array and pagination metadata
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    query: PaginationQueryDto,
  ) {
    // Use pure function from pagination schema
    const meta = createPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  }
}
