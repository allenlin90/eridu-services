import { UtilityService } from '@/utility/utility.service';

/**
 * Base service class for core model entity services providing common functionality
 * such as UID generation and CRUD patterns.
 *
 * This class is specifically designed for services that manage single entities
 * with direct database operations (User, Client, MC, Platform, Show, etc.).
 *
 * Child classes MUST:
 * 1. Define a static `UID_PREFIX` constant for schema validation
 * 2. Implement the `uidPrefix` property getter returning the static value
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService extends BaseModelService {
 *   static readonly UID_PREFIX = 'user';
 *   protected readonly uidPrefix = UserService.UID_PREFIX;
 * }
 * ```
 */
export abstract class BaseModelService {
  /**
   * UID prefix for this entity type (e.g., 'user', 'client', 'std_').
   * Must be implemented by each service to return their static UID_PREFIX.
   */
  protected abstract readonly uidPrefix: string;

  constructor(protected readonly utilityService: UtilityService) {}

  /**
   * Generates a branded UID for an entity using the service's UID prefix.
   *
   * @param size - Optional size of the random ID part (default: 20)
   * @returns A branded UID string in the format: `{uidPrefix}_{randomId}`
   *
   * @example
   * ```typescript
   * const uid = this.generateUid();
   * // Returns: 'user_abc123xyz...' (for UserService)
   * ```
   */
  protected generateUid(size?: number): string {
    return this.utilityService.generateBrandedId(this.uidPrefix, size);
  }
}
