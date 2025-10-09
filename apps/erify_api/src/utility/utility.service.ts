import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

@Injectable()
export class UtilityService {
  generateBrandedId(prefix: string, size: number = 20): string {
    return `${prefix}_${nanoid(size)}`;
  }
}
