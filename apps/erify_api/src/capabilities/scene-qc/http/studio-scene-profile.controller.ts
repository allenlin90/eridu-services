import { Body, Controller, Delete, Get, HttpStatus, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { SceneProfileService } from '../scene-profile.service';
import {
  RetireSceneProfileQueryDto,
  SaveSceneProfileDto,
  sceneProfileDto,
} from '../schemas/scene-profile.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ClientService } from '@/models/client/client.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

/**
 * Stage 1 Scene Profile administration: a Client's single mutable
 * expected-scene reference. Per plan section 3, DESIGNER/MANAGER/ADMIN share
 * identical Scene QC permissions; MODERATION_MANAGER is excluded.
 *
 * The Client existence + studio<->client linkage gates mirror
 * StudioClientMechanicController exactly and run on EVERY route, reads
 * included: a Scene Profile is Client-owned and edits propagate to every studio
 * that Client is reviewed in, so a studio that merely knows another client's UID
 * must not read or write its profile.
 */
@ApiTags('Studio Scene Profiles')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-profiles')
export class StudioSceneProfileController extends BaseStudioController {
  constructor(
    private readonly sceneProfileService: SceneProfileService,
    private readonly clientService: ClientService,
    private readonly showService: ShowService,
  ) {
    super();
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.clientService.getClientByUid(clientId);
    if (!client) {
      throw HttpError.notFound('Client');
    }
  }

  private async ensureStudioClientLinkage(studioId: string, clientId: string): Promise<void> {
    const count = await this.showService.countShows({
      studio: { uid: studioId },
      client: { uid: clientId },
      deletedAt: null,
    });
    if (count === 0) {
      throw HttpError.forbidden('Studio not linked to client');
    }
  }

  @ApiOperation({ summary: 'Get a Client\'s current Scene Profile reference' })
  @Get(':clientId')
  @ReadBurstThrottle()
  @ZodResponse(sceneProfileDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
  ) {
    await this.ensureClientExists(clientId);
    await this.ensureStudioClientLinkage(studioId, clientId);

    const profile = await this.sceneProfileService.getActiveProfileForClient(clientId);
    // 404 is the "no Scene Profile" state; the frontend renders it as the empty
    // state, not an error.
    this.ensureResourceExists(profile, 'Scene profile', clientId);
    return profile;
  }

  @ApiOperation({ summary: 'Create or replace a Client\'s Scene Profile in one version-checked call' })
  @Put(':clientId')
  @ZodResponse(sceneProfileDto, HttpStatus.OK)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Body() body: SaveSceneProfileDto,
  ) {
    await this.ensureClientExists(clientId);
    await this.ensureStudioClientLinkage(studioId, clientId);

    return this.sceneProfileService.saveProfileForClient(clientId, body, {
      actorExtId: user.ext_id,
      studioUid: studioId,
    });
  }

  @ApiOperation({ summary: 'Retire a Client\'s Scene Profile reference (soft delete)' })
  @Delete(':clientId')
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async retire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('clientId', new UidValidationPipe(ClientService.UID_PREFIX, 'Client')) clientId: string,
    @Query() query: RetireSceneProfileQueryDto,
  ) {
    await this.ensureClientExists(clientId);
    await this.ensureStudioClientLinkage(studioId, clientId);

    const retired = await this.sceneProfileService.retireProfileForClient(
      clientId,
      { actorExtId: user.ext_id, studioUid: studioId },
      query.version,
    );
    this.ensureResourceExists(retired, 'Scene profile', clientId);
  }
}
