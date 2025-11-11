import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { PaginationMeta } from '@/common/pagination/schema/pagination.schema';

@Injectable()
export class UtilityService {
  generateBrandedId(prefix: string, size: number = 20): string {
    return `${prefix}_${nanoid(size)}`;
  }

  /**
   * Creates pagination metadata for API responses
   * @param page Current page number (1-based)
   * @param limit Number of items per page
   * @param total Total number of items
   * @returns Pagination metadata object
   */
  createPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
