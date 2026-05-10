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

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
import {
  compensationLineItemDto,
  CreateAdminCompensationLineItemDto,
  ListCompensationLineItemsQueryDto,
  UpdateCompensationLineItemDto,
} from '@/models/compensation-line-item/schemas/compensation-line-item.schema';

@Controller('admin/compensation-line-items')
export class AdminCompensationLineItemController extends BaseAdminController {
  constructor(private readonly compensationLineItemService: CompensationLineItemService) {
    super();
  }

  @Post()
  @AdminResponse(
    compensationLineItemDto,
    HttpStatus.CREATED,
    'Compensation line item created successfully',
  )
  createLineItem(
    @Body() body: CreateAdminCompensationLineItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.compensationLineItemService.createAdminLineItem(body, user.ext_id);
  }

  @Get()
  @AdminPaginatedResponse(
    compensationLineItemDto,
    'List compensation line items with pagination',
  )
  async listLineItems(@Query() query: ListCompensationLineItemsQueryDto) {
    const { data, total } = await this.compensationLineItemService.listAdminLineItems(query);
    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':lineItemId')
  @AdminResponse(compensationLineItemDto, HttpStatus.OK, 'Compensation line item details')
  async getLineItem(
    @Param(
      'lineItemId',
      new UidValidationPipe(
        CompensationLineItemService.UID_PREFIX,
        'Compensation line item',
      ),
    )
    lineItemId: string,
  ) {
    const lineItem = await this.compensationLineItemService.getAdminLineItem(lineItemId);
    this.ensureResourceExists(lineItem, 'Compensation line item', lineItemId);
    return lineItem;
  }

  @Patch(':lineItemId')
  @AdminResponse(
    compensationLineItemDto,
    HttpStatus.OK,
    'Compensation line item updated successfully',
  )
  async updateLineItem(
    @Param(
      'lineItemId',
      new UidValidationPipe(
        CompensationLineItemService.UID_PREFIX,
        'Compensation line item',
      ),
    )
    lineItemId: string,
    @Body() body: UpdateCompensationLineItemDto,
  ) {
    const lineItem = await this.compensationLineItemService.updateAdminLineItem(
      lineItemId,
      body,
    );
    this.ensureResourceExists(lineItem, 'Compensation line item', lineItemId);
    return lineItem;
  }

  @Delete(':lineItemId')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteLineItem(
    @Param(
      'lineItemId',
      new UidValidationPipe(
        CompensationLineItemService.UID_PREFIX,
        'Compensation line item',
      ),
    )
    lineItemId: string,
  ) {
    const lineItem = await this.compensationLineItemService.deleteAdminLineItem(lineItemId);
    this.ensureResourceExists(lineItem, 'Compensation line item', lineItemId);
  }
}
