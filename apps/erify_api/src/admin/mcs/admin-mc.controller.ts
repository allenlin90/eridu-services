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

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { McService } from '@/models/mc/mc.service';
import {
  CreateMcDto,
  mcWithUserDto,
  UpdateMcDto,
} from '@/models/mc/schemas/mc.schema';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/mcs')
export class AdminMcController extends BaseAdminController {
  constructor(
    private readonly mcService: McService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(mcWithUserDto, 'MC created successfully')
  @ZodSerializerDto(mcWithUserDto)
  createMc(@Body() body: CreateMcDto) {
    return this.mcService.createMcFromDto(body, { user: true });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(mcWithUserDto),
    'List of MCs with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(mcWithUserDto))
  async getMcs(@Query() query: PaginationQueryDto) {
    const data = await this.mcService.getMcs(
      { skip: query.skip, take: query.take },
      { user: true },
    );
    const total = await this.mcService.countMcs();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(mcWithUserDto, 'MC details')
  @ZodSerializerDto(mcWithUserDto)
  getMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
  ) {
    return this.mcService.getMcById(id, { user: true });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(mcWithUserDto, 'MC updated successfully')
  @ZodSerializerDto(mcWithUserDto)
  updateMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
    @Body() body: UpdateMcDto,
  ) {
    return this.mcService.updateMcFromDto(id, body, { user: true });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMc(
    @Param('id', new UidValidationPipe(McService.UID_PREFIX, 'MC'))
    id: string,
  ) {
    await this.mcService.deleteMc(id);
  }
}
