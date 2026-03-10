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
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateStudioScopedMembershipDto,
  ListMembershipUserCatalogQueryDto,
  ListStudioMembershipsQueryDto,
  membershipUserCatalogItemDto,
  studioMembershipWithRelationsDto,
  UpdateStudioMembershipHelperDto,
  UpdateStudioMembershipRoleDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Memberships')
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/studio-memberships')
export class StudioMembershipController extends BaseStudioController {
  constructor(private readonly studioMembershipService: StudioMembershipService) {
    super();
  }

  @Get('user-catalog')
  @ApiOperation({ summary: 'List users for studio membership invite combobox' })
  @ZodResponse(membershipUserCatalogItemDto.array())
  async listUserCatalog(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListMembershipUserCatalogQueryDto,
  ) {
    return this.studioMembershipService.listMembershipUserCatalog(studioId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create studio membership' })
  @ZodResponse(studioMembershipWithRelationsDto, HttpStatus.CREATED)
  async createMembership(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateStudioScopedMembershipDto,
  ) {
    return this.studioMembershipService.createStudioMembership(
      {
        ...body,
        // Scope membership creation to route studio ID.
        studioId,
      },
      { user: true, studio: true },
    );
  }

  @ApiOperation({ summary: 'Update studio membership role' })
  @Patch(':id/role')
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @ZodResponse(studioMembershipWithRelationsDto)
  async updateRole(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioMembershipService.UID_PREFIX, 'Studio Membership')) id: string,
    @Body() dto: UpdateStudioMembershipRoleDto,
  ) {
    const { data } = await this.studioMembershipService.listStudioMemberships({
      studioId,
      uid: id,
      take: 1,
      skip: 0,
    }, {
      user: true,
      studio: true,
    });
    const existing = data[0] ?? null;
    this.ensureResourceExists(existing, 'Studio Membership', id);

    return this.studioMembershipService.updateStudioMembership(
      id,
      { role: dto.role },
      { user: true, studio: true },
    );
  }

  @Get()
  @ZodPaginatedResponse(studioMembershipWithRelationsDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioMembershipsQueryDto,
  ) {
    const { studioId: _ignoredStudioId, ...scopedQuery } = query;
    const { data, total } = await this.studioMembershipService.listStudioMemberships(
      { ...scopedQuery, studioId },
      { user: true, studio: true },
    );

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @ApiOperation({ summary: 'Toggle task-helper readiness on a studio membership' })
  @Patch(':id/helper')
  @ZodResponse(studioMembershipWithRelationsDto)
  async updateHelperStatus(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioMembershipService.UID_PREFIX, 'Studio Membership')) id: string,
    @Body() dto: UpdateStudioMembershipHelperDto,
  ) {
    const updated = await this.studioMembershipService.toggleTaskHelperStatus(
      studioId,
      id,
      dto.isHelper,
    );
    this.ensureResourceExists(updated, 'Studio Membership', id);

    return updated;
  }

  @ApiOperation({ summary: 'Remove studio membership' })
  @Delete(':id')
  @ZodResponse(studioMembershipWithRelationsDto)
  async removeMembership(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioMembershipService.UID_PREFIX, 'Studio Membership')) id: string,
  ) {
    const { data } = await this.studioMembershipService.listStudioMemberships({
      studioId,
      uid: id,
      take: 1,
      skip: 0,
    }, {
      user: true,
      studio: true,
    });
    const existing = data[0] ?? null;
    this.ensureResourceExists(existing, 'Studio Membership', id);

    await this.studioMembershipService.deleteStudioMembership(id);
    return existing;
  }
}
