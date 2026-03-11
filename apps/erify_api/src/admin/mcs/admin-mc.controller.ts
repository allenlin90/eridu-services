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
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import { McService } from '@/models/mc/mc.service';
import {
  CreateMcDto,
  ListMcsQueryDto,
  mcWithUserDto,
  UpdateMcDto,
} from '@/models/mc/schemas/mc.schema';

@Controller('admin/mcs')
export class AdminMcController extends BaseAdminController {
  constructor(private readonly mcService: McService) {
    super();
  }

  @Post()
  @AdminResponse(mcWithUserDto, HttpStatus.CREATED, 'MC created successfully')
  async createMc(@Body() body: CreateMcDto) {
    const {
      name,
      aliasName,
      metadata,
      userId,
      defaultRate,
      defaultRateType,
      defaultCommissionRate,
    } = body;
    const mc = await this.mcService.createMc({
      name,
      aliasName,
      metadata,
      userId,
      ...(defaultRate !== undefined && { defaultRate }),
      ...(defaultRateType !== undefined && { defaultRateType }),
      ...(defaultCommissionRate !== undefined && { defaultCommissionRate }),
    });
    return this.mcService.getMcByIdWithUser(mc.uid);
  }

  @Get()
  @AdminPaginatedResponse(mcWithUserDto, 'List of MCs with pagination')
  async getMcs(@Query() query: ListMcsQueryDto) {
    const { data, total } = await this.mcService.listMcs({
      skip: query.skip,
      take: query.take,
      name: query.name,
      aliasName: query.aliasName,
      uid: query.uid,
      includeDeleted: query.include_deleted,
      includeUser: true,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(mcWithUserDto, HttpStatus.OK, 'MC details')
  async getMc(
    @Param(
      'id',
      new UidValidationPipe([McService.UID_PREFIX, CREATOR_UID_PREFIX], 'MC'),
    )
    id: string,
  ) {
    const mc = await this.mcService.getMcByIdWithUser(id);
    this.ensureResourceExists(mc, 'MC', id);
    return mc;
  }

  @Patch(':id')
  @AdminResponse(mcWithUserDto, HttpStatus.OK, 'MC updated successfully')
  async updateMc(
    @Param(
      'id',
      new UidValidationPipe([McService.UID_PREFIX, CREATOR_UID_PREFIX], 'MC'),
    )
    id: string,
    @Body() body: UpdateMcDto,
  ) {
    // Check existence first
    const existing = await this.mcService.getMcById(id);
    this.ensureResourceExists(existing, 'MC', id);

    const {
      name,
      aliasName,
      isBanned,
      metadata,
      userId,
      defaultRate,
      defaultRateType,
      defaultCommissionRate,
    } = body;
    await this.mcService.updateMc(id, {
      name,
      aliasName,
      isBanned,
      metadata,
      userId,
      ...(defaultRate !== undefined && { defaultRate }),
      ...(defaultRateType !== undefined && { defaultRateType }),
      ...(defaultCommissionRate !== undefined && { defaultCommissionRate }),
    });

    return this.mcService.getMcByIdWithUser(id);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteMc(
    @Param(
      'id',
      new UidValidationPipe([McService.UID_PREFIX, CREATOR_UID_PREFIX], 'MC'),
    )
    id: string,
  ) {
    // Check existence first
    const existing = await this.mcService.getMcById(id);
    this.ensureResourceExists(existing, 'MC', id);

    await this.mcService.deleteMc(id);
  }
}
