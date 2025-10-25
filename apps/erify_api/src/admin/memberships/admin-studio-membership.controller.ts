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
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '../../common/pipes/uid-validation.pipe';
import {
  CreateStudioMembershipDto,
  StudioMembershipWithRelationsDto,
  studioMembershipWithRelationsDto,
  UpdateStudioMembershipDto,
} from '../../membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '../../membership/studio-membership.service';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/studio-memberships')
export class AdminStudioMembershipController extends BaseAdminController {
  constructor(
    private readonly studioMembershipService: StudioMembershipService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(StudioMembershipWithRelationsDto)
  async createStudioMembership(@Body() body: CreateStudioMembershipDto) {
    return this.studioMembershipService.createStudioMembershipFromDto(body, {
      user: true,
      studio: true,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(
    createPaginatedResponseSchema(studioMembershipWithRelationsDto),
  )
  async getStudioMemberships(@Query() query: PaginationQueryDto) {
    const data = await this.studioMembershipService.getStudioMemberships(
      { skip: query.skip, take: query.take },
      { user: true, studio: true },
    );
    const total = await this.studioMembershipService.countStudioMemberships();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioMembershipWithRelationsDto)
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
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioMembershipWithRelationsDto)
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
  @HttpCode(HttpStatus.NO_CONTENT)
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
