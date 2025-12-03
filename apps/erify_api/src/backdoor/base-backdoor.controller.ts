import { Backdoor } from '@/lib/decorators/backdoor.decorator';

/**
 * Base controller for backdoor endpoints.
 *
 * This controller uses the @Backdoor() decorator to skip JWT authentication,
 * allowing these endpoints to use API key authentication via BackdoorApiKeyGuard instead.
 *
 * All backdoor controllers should extend this base class to ensure proper
 * authentication bypass for JWT while still requiring API key validation.
 */
@Backdoor()
export abstract class BaseBackdoorController {
  constructor() {}
}
