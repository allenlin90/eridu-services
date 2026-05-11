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

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { BaseStudioController } from '../base-studio.controller';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
import {
  compensationLineItemDto,
  CreateStudioCompensationLineItemDto,
  ListStudioCompensationLineItemsQueryDto,
  UpdateCompensationLineItemDto,
} from '@/models/compensation-line-item/schemas/compensation-line-item.schema';
import { StudioService } from '@/models/studio/studio.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
@Controller('studios/:studioId/compensation-line-items')
export class StudioCompensationLineItemController extends BaseStudioController {
  constructor(private readonly compensationLineItemService: CompensationLineItemService) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(compensationLineItemDto)
  async listLineItems(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
    @Query() query: ListStudioCompensationLineItemsQueryDto,
  ) {
    const { data, total } = await this.compensationLineItemService
      .listStudioLineItems({
        studioId,
        targetType: query.targetType,
        targetId: query.targetId,
        itemType: query.itemType,
        from: query.from,
        to: query.to,
        skip: query.skip,
        take: query.take,
        sort: query.sort,
        includeDeleted: query.includeDeleted,
      });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Post()
  @ZodResponse(compensationLineItemDto, HttpStatus.CREATED)
  createLineItem(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
    @Body() body: CreateStudioCompensationLineItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.compensationLineItemService.createStudioLineItem(
      studioId,
      body,
      user.ext_id,
    );
  }

  @Patch(':lineItemId')
  @ZodResponse(compensationLineItemDto)
  async updateLineItem(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
    @Param(
      'lineItemId',
      new UidValidationPipe(CompensationLineItemService.UID_PREFIX, 'Compensation line item'),
    )
    lineItemId: string,
    @Body() body: UpdateCompensationLineItemDto,
  ) {
    const lineItem = await this.compensationLineItemService.updateStudioLineItem(
      { studioId, lineItemId },
      body,
    );
    this.ensureResourceExists(lineItem, 'Compensation line item', lineItemId);
    return lineItem;
  }

  @Delete(':lineItemId')
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteLineItem(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
    @Param(
      'lineItemId',
      new UidValidationPipe(CompensationLineItemService.UID_PREFIX, 'Compensation line item'),
    )
    lineItemId: string,
  ) {
    const lineItem = await this.compensationLineItemService.deleteStudioLineItem({
      studioId,
      lineItemId,
    });
    this.ensureResourceExists(lineItem, 'Compensation line item', lineItemId);
  }
}
