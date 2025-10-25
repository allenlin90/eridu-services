import { PaginationQueryDto } from '../common/pagination/schema/pagination.schema';
import { UtilityService } from '../utility/utility.service';

/**
 * Base controller for admin endpoints providing common functionality
 * such as pagination response creation.
 */
export abstract class BaseAdminController {
  constructor(protected readonly utilityService: UtilityService) {}

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
    const meta = this.utilityService.createPaginationMeta(
      query.page,
      query.limit,
      total,
    );
    return { data, meta };
  }
}
