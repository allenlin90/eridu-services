import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { AdminResponse } from '@/admin/decorators/admin-response.decorator';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import {
  CreateStudioMembershipDto,
  studioMembershipWithRelationsDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';

/**
 * Backdoor Membership Controller
 *
 * Service-to-service API key authenticated endpoints for studio membership management.
 * These endpoints are separate from admin controllers to allow for:
 * - Different authentication mechanism (API key vs JWT)
 * - Future IP whitelisting
 * - Clear separation of concerns
 *
 * Endpoints:
 * - POST /backdoor/studio-memberships - Create studio membership (API key required)
 */
@Controller('backdoor/studio-memberships')
@UseGuards(BackdoorApiKeyGuard)
export class BackdoorMembershipController extends BaseAdminController {
  constructor(
    private readonly studioMembershipService: StudioMembershipService,
  ) {
    super();
  }

  @Post()
  @AdminResponse(
    studioMembershipWithRelationsDto,
    HttpStatus.CREATED,
    'Studio membership created successfully',
  )
  async createStudioMembership(@Body() body: CreateStudioMembershipDto) {
    return this.studioMembershipService.createStudioMembershipFromDto(body, {
      user: true,
      studio: true,
    });
  }
}
