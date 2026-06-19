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

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ClientService } from '@/models/client/client.service';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import {
  clientMechanicDto,
  CreateClientMechanicDto,
  ListClientMechanicsQueryDto,
  UpdateClientMechanicDto,
} from '@/models/client-mechanic/schemas/client-mechanic.schema';
import { StudioService } from '@/models/studio/studio.service';

/**
 * Client-owned mechanic catalog, managed under a studio scope.
 *
 * Routes are studio-scoped (the StudioGuard enforces membership + role on
 * `:studioId`) but the catalog itself belongs to the global `Client`, so edits
 * propagate cross-studio (B2). The shows-based studio↔client linkage gate is
 * deferred to a later PR; this foundation only validates that the client exists.
 */
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ACCOUNT_MANAGER])
@Controller('studios/:studioId/clients/:clientId/mechanics')
export class StudioClientMechanicController extends BaseStudioController {
  constructor(
    private readonly clientMechanicService: ClientMechanicService,
    private readonly clientService: ClientService,
  ) {
    super();
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.clientService.getClientByUid(clientId);
    if (!client) {
      throw HttpError.notFound('Client');
    }
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(clientMechanicDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Query() query: ListClientMechanicsQueryDto,
  ) {
    await this.ensureClientExists(clientId);

    const { data, total } = await this.clientMechanicService.listMechanics({
      clientUid: clientId,
      search: query.search,
      status: query.status,
      skip: query.skip,
      take: query.take,
      sort: query.sort,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get(':mechanicId')
  @ZodResponse(clientMechanicDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Param('mechanicId', new UidValidationPipe(ClientMechanicService.UID_PREFIX, 'ClientMechanic')) mechanicId: string,
  ) {
    const mechanic = await this.clientMechanicService.getMechanic({
      mechanicUid: mechanicId,
      clientUid: clientId,
    });

    if (!mechanic) {
      throw HttpError.notFound('Client mechanic');
    }

    return mechanic;
  }

  @Post()
  @ZodResponse(clientMechanicDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Body() body: CreateClientMechanicDto,
  ) {
    await this.ensureClientExists(clientId);

    return this.clientMechanicService.createMechanic(clientId, body);
  }

  @Patch(':mechanicId')
  @ZodResponse(clientMechanicDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Param('mechanicId', new UidValidationPipe(ClientMechanicService.UID_PREFIX, 'ClientMechanic')) mechanicId: string,
    @Body() body: UpdateClientMechanicDto,
  ) {
    const mechanic = await this.clientMechanicService.updateMechanic(
      { mechanicUid: mechanicId, clientUid: clientId },
      body,
    );

    if (!mechanic) {
      throw HttpError.notFound('Client mechanic');
    }

    return mechanic;
  }

  @Delete(':mechanicId')
  @ZodResponse(clientMechanicDto)
  async retire(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Param('mechanicId', new UidValidationPipe(ClientMechanicService.UID_PREFIX, 'ClientMechanic')) mechanicId: string,
  ) {
    const mechanic = await this.clientMechanicService.retireMechanic({
      mechanicUid: mechanicId,
      clientUid: clientId,
    });

    if (!mechanic) {
      throw HttpError.notFound('Client mechanic');
    }

    return mechanic;
  }
}
