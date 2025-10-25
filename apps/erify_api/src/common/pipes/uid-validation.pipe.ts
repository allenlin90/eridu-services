import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates that a UID parameter starts with the expected prefix.
 * Used for path parameters like `:uid` in controllers.
 *
 * @example
 * ```typescript
 * @Get(':uid')
 * getUser(@Param('uid', new UidValidationPipe('user', 'User')) uid: string) {
 *   return this.userService.getUserById(uid);
 * }
 * ```
 */
@Injectable()
export class UidValidationPipe implements PipeTransform<string, string> {
  constructor(
    private readonly expectedPrefix: string,
    private readonly modelName: string,
  ) {}

  transform(value: string): string {
    if (!value) {
      throw new BadRequestException({
        statusCode: 400,
        message: `${this.modelName} ID is required`,
      });
    }

    // Normalize prefix: add underscore if not already present
    const normalizedPrefix = this.expectedPrefix.endsWith('_')
      ? this.expectedPrefix
      : `${this.expectedPrefix}_`;

    if (!value.startsWith(normalizedPrefix)) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Invalid ${this.modelName} ID`,
      });
    }

    // Basic validation: ensure there's content after the prefix
    const contentAfterPrefix = value.substring(normalizedPrefix.length);
    if (!contentAfterPrefix) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Invalid ${this.modelName} ID`,
      });
    }

    return value;
  }
}
