import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

@Injectable()
export class UtilityService {
  /**
   * Generates a branded ID with a prefix
   * @param prefix The prefix for the ID (e.g., 'user', 'show')
   * @param size The size of the random part (default: 20)
   */
  generateBrandedId(prefix: string, size: number = 20): string {
    return `${prefix}_${nanoid(size)}`;
  }
}
