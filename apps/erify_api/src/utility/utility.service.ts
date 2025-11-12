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

  /**
   * Checks if two time ranges overlap.
   * Two time ranges overlap if the start of one is before the end of the other
   * and the end of one is after the start of the other.
   *
   * @param start1 - Start time of first range (ISO string)
   * @param end1 - End time of first range (ISO string)
   * @param start2 - Start time of second range (ISO string)
   * @param end2 - End time of second range (ISO string)
   * @returns true if the time ranges overlap, false otherwise
   */
  isTimeOverlapping(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();

    return s1 < e2 && s2 < e1;
  }
}
