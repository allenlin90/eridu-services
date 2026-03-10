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
import { CreatorService } from '@/models/creator/creator.service';
import {
  CreateCreatorDto,
  creatorWithUserDto,
  ListCreatorsQueryDto,
  UpdateCreatorDto,
} from '@/models/creator/schemas/creator.schema';

@Controller('admin/creators')
export class AdminCreatorController extends BaseAdminController {
  constructor(private readonly creatorService: CreatorService) {
    super();
  }

  @Post()
  @AdminResponse(creatorWithUserDto, HttpStatus.CREATED, 'Creator created successfully')
  async createCreator(@Body() body: CreateCreatorDto) {
    const {
      name,
      aliasName,
      metadata,
      userId,
      defaultRate,
      defaultRateType,
      defaultCommissionRate,
    } = body;
    const creator = await this.creatorService.createCreator({
      name,
      aliasName,
      metadata,
      userId,
      defaultRate,
      defaultRateType,
      defaultCommissionRate,
    });
    return this.creatorService.getCreatorByIdWithUser(creator.uid);
  }

  @Get()
  @AdminPaginatedResponse(creatorWithUserDto, 'List of creators with pagination')
  async getCreators(@Query() query: ListCreatorsQueryDto) {
    const { data, total } = await this.creatorService.listCreators({
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
  @AdminResponse(creatorWithUserDto, HttpStatus.OK, 'Creator details')
  async getCreator(
    @Param('id', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator'))
    id: string,
  ) {
    const creator = await this.creatorService.getCreatorByIdWithUser(id);
    this.ensureResourceExists(creator, 'Creator', id);
    return creator;
  }

  @Patch(':id')
  @AdminResponse(creatorWithUserDto, HttpStatus.OK, 'Creator updated successfully')
  async updateCreator(
    @Param('id', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator'))
    id: string,
    @Body() body: UpdateCreatorDto,
  ) {
    const existing = await this.creatorService.getCreatorById(id);
    this.ensureResourceExists(existing, 'Creator', id);

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
    await this.creatorService.updateCreator(id, {
      name,
      aliasName,
      isBanned,
      metadata,
      userId,
      defaultRate,
      defaultRateType,
      defaultCommissionRate,
    });

    return this.creatorService.getCreatorByIdWithUser(id);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteCreator(
    @Param('id', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator'))
    id: string,
  ) {
    const existing = await this.creatorService.getCreatorById(id);
    this.ensureResourceExists(existing, 'Creator', id);

    await this.creatorService.deleteCreator(id);
  }
}
