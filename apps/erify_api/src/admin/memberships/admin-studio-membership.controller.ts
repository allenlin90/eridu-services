import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateStudioMembershipDto,
  ListStudioMembershipsQueryDto,
  studioMembershipWithRelationsDto,
  UpdateStudioMembershipDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';

@Controller('admin/studio-memberships')
export class AdminStudioMembershipController extends BaseAdminController {
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

  @Get()
  @AdminPaginatedResponse(
    studioMembershipWithRelationsDto,
    'List of studio memberships with pagination',
  )
  async getStudioMemberships(@Query() query: ListStudioMembershipsQueryDto) {
    const { data, total } = await this.studioMembershipService.listStudioMemberships(
      { skip: query.skip, take: query.take, uid: query.uid },
      { user: true, studio: true },
    );

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(
    studioMembershipWithRelationsDto,
    HttpStatus.OK,
    'Studio membership details',
  )
  getStudioMembership(
    @Param(
      'id',
      new UidValidationPipe(
        StudioMembershipService.UID_PREFIX,
        'Studio Membership',
      ),
    )
    id: string,
  ) {
    return this.studioMembershipService.getStudioMembershipById(id, {
      user: true,
      studio: true,
    });
  }

  @Patch(':id')
  @AdminResponse(
    studioMembershipWithRelationsDto,
    HttpStatus.OK,
    'Studio membership updated successfully',
  )
  updateStudioMembership(
    @Param(
      'id',
      new UidValidationPipe(
        StudioMembershipService.UID_PREFIX,
        'Studio Membership',
      ),
    )
    id: string,
    @Body() body: UpdateStudioMembershipDto,
  ) {
    return this.studioMembershipService.updateStudioMembershipFromDto(
      id,
      body,
      {
        user: true,
        studio: true,
      },
    );
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteStudioMembership(
    @Param(
      'id',
      new UidValidationPipe(
        StudioMembershipService.UID_PREFIX,
        'Studio Membership',
      ),
    )
    id: string,
  ) {
    await this.studioMembershipService.deleteStudioMembership(id);
  }
}
