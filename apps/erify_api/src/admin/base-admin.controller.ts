import { AdminProtected } from '@/lib/decorators/admin-protected.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import {
  createPaginationMeta,
  PaginationQueryDto,
} from '@/lib/pagination/pagination.schema';

/**
 * Base controller for admin endpoints providing common functionality
 * such as pagination response creation and error handling.
 */
@AdminProtected()
export abstract class BaseAdminController {
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

  /**
   * Validates that a resource exists, throwing a NotFoundException if it doesn't.
   * Useful for ensuring resources exist before performing operations on them.
   *
   * @param resource - The resource object (can be null/undefined)
   * @param resourceName - Name of the resource type (e.g., 'User', 'Schedule')
   * @param identifier - Optional identifier to include in error message
   * @throws NotFoundException if resource is null or undefined
   *
   * @example
   * ```typescript
   * const user = await this.userService.getUserById(id);
   * this.ensureResourceExists(user, 'User', id);
   * ```
   */
  protected ensureResourceExists<T>(
    resource: T | null | undefined,
    resourceName: string,
    identifier?: string | number,
  ): asserts resource is T {
    if (!resource) {
      throw HttpError.notFound(resourceName, identifier);
    }
  }

  /**
   * Validates that a required field exists on a resource.
   * Throws BadRequestException if the field is missing.
   * Returns the value for type narrowing.
   *
   * @param value - The value to check (can be null/undefined)
   * @param fieldName - Name of the field (e.g., 'createdBy', 'userId')
   * @param resourceName - Name of the resource type (e.g., 'Schedule')
   * @returns The validated value (guaranteed to be non-null)
   * @throws BadRequestException if value is null or undefined
   *
   * @example
   * ```typescript
   * const createdBy = this.ensureFieldExists(schedule.createdBy, 'createdBy', 'Schedule');
   * ```
   */
  protected ensureFieldExists<T>(
    value: T | null | undefined,
    fieldName: string,
    resourceName: string,
  ): T {
    if (value === null || value === undefined) {
      throw HttpError.badRequest(`${resourceName} must have a ${fieldName}`);
    }
    return value;
  }

  /**
   * Wraps an async operation with error handling.
   * Can be extended in the future for logging, metrics, etc.
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws The original error (errors are handled by global exception filters)
   *
   * @example
   * ```typescript
   * return this.handleOperation(async () => {
   *   return this.scheduleService.createSchedule(data);
   * });
   * ```
   */
  protected async handleOperation<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}
