import { BaseController } from '@/lib/controllers/base.controller';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';

/**
 * Base controller for studio endpoints providing common functionality
 * such as pagination response creation and error handling.
 *
 * All controllers extending this will automatically be protected by StudioGuard
 * and require a valid studio membership.
 */
@StudioProtected()
export abstract class BaseStudioController extends BaseController {
  constructor() {
    super();
  }
}
