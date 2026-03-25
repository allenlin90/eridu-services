import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import type { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  AddStudioMemberDto,
  studioMemberDto,
  UpdateStudioMemberDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Members')
@Controller('studios/:studioId/members')
export class StudioMembersController extends BaseStudioController {
  constructor(
    private readonly studioMembershipService: StudioMembershipService,
  ) {
    super();
  }

  @ApiOperation({ summary: 'List all active studio members with user details' })
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(studioMemberDto)
  async listMembers(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
  ) {
    const data = await this.studioMembershipService.listStudioMembers(studioId);
    const total = data.length;
    return this.createPaginatedResponse(data, total, {
      page: 1,
      limit: total || 1,
      take: total,
      skip: 0,
    });
  }

  @ApiOperation({ summary: 'Add a member to the studio by email lookup' })
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse(studioMemberDto, HttpStatus.CREATED)
  async addMember(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: AddStudioMemberDto,
  ) {
    const { email, role, base_hourly_rate } = dto;
    return this.studioMembershipService.addStudioMember({
      email,
      role,
      baseHourlyRate: base_hourly_rate,
      studioUid: studioId,
    });
  }

  @ApiOperation({ summary: 'Update a studio member role or hourly rate' })
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Patch(':membershipId')
  @ZodResponse(studioMemberDto, HttpStatus.OK)
  async updateMember(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('membershipId', new UidValidationPipe(StudioMembershipService.UID_PREFIX, 'Membership')) membershipId: string,
    @Body() dto: UpdateStudioMemberDto,
    @Req() request: AuthenticatedRequest,
  ) {
    // Verify the membership belongs to this studio
    const existing = await this.studioMembershipService.findStudioMemberByUidAndStudio(
      membershipId,
      studioId,
    );
    this.ensureResourceExists(existing, 'Membership', membershipId);

    const actorMembershipUid = request.studioMembership?.uid;

    const { role, base_hourly_rate } = dto;
    const updated = await this.studioMembershipService.updateStudioMember(
      membershipId,
      {
        role,
        baseHourlyRate: base_hourly_rate,
      },
      actorMembershipUid,
    );

    this.ensureResourceExists(updated, 'Membership', membershipId);
    return updated;
  }

  @ApiOperation({ summary: 'Remove (soft-deactivate) a studio member' })
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Delete(':membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('membershipId', new UidValidationPipe(StudioMembershipService.UID_PREFIX, 'Membership')) membershipId: string,
  ) {
    // Verify the membership belongs to this studio
    const existing = await this.studioMembershipService.findStudioMemberByUidAndStudio(
      membershipId,
      studioId,
    );
    this.ensureResourceExists(existing, 'Membership', membershipId);

    await this.studioMembershipService.removeStudioMember(membershipId);
  }
}
