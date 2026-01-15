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
  createMc(@Body() body: CreateMcDto) {
    return this.mcService.createMcFromDto(body, { user: true });
  }

  @Get()
  @AdminPaginatedResponse(mcWithUserDto, 'List of MCs with pagination')
  async getMcs(@Query() query: ListMcsQueryDto) {
    const { data, total } = await this.mcService.listMcs(
      {
        skip: query.skip,
        take: query.take,
        name: query.name,
        include_deleted: query.include_deleted,
      },
      { user: true },
    );

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(mcWithUserDto, HttpStatus.OK, 'MC details')
  getMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
  ) {
    return this.mcService.getMcById(id, { user: true });
  }

  @Patch(':id')
  @AdminResponse(mcWithUserDto, HttpStatus.OK, 'MC updated successfully')
  updateMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
    @Body() body: UpdateMcDto,
  ) {
    return this.mcService.updateMcFromDto(id, body, { user: true });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
  ) {
    await this.mcService.deleteMc(id);
  }
}
