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
    const { name, aliasName, metadata, userId } = body;
    const creator = await this.creatorService.createMc({
      name,
      aliasName,
      metadata,
      userId,
    });
    return this.creatorService.getMcByIdWithUser(creator.uid);
  }

  @Get()
  @AdminPaginatedResponse(creatorWithUserDto, 'List of creators with pagination')
  async getCreators(@Query() query: ListCreatorsQueryDto) {
    const { data, total } = await this.creatorService.listMcs({
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
    @Param('id', new UidValidationPipe(CreatorService.UID_PREFIX, 'Creator'))
    id: string,
  ) {
    const creator = await this.creatorService.getMcByIdWithUser(id);
    this.ensureResourceExists(creator, 'Creator', id);
    return creator;
  }

  @Patch(':id')
  @AdminResponse(creatorWithUserDto, HttpStatus.OK, 'Creator updated successfully')
  async updateCreator(
    @Param('id', new UidValidationPipe(CreatorService.UID_PREFIX, 'Creator'))
    id: string,
    @Body() body: UpdateCreatorDto,
  ) {
    const existing = await this.creatorService.getMcById(id);
    this.ensureResourceExists(existing, 'Creator', id);

    const { name, aliasName, isBanned, metadata, userId } = body;
    await this.creatorService.updateMc(id, {
      name,
      aliasName,
      isBanned,
      metadata,
      userId,
    });

    return this.creatorService.getMcByIdWithUser(id);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteCreator(
    @Param('id', new UidValidationPipe(CreatorService.UID_PREFIX, 'Creator'))
    id: string,
  ) {
    const existing = await this.creatorService.getMcById(id);
    this.ensureResourceExists(existing, 'Creator', id);

    await this.creatorService.deleteMc(id);
  }
}
