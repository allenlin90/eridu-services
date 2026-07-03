import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';

import { BaseGoogleSheetsController } from '../base-google-sheets.controller';

import { ApiZodResponse } from '@/lib/openapi/decorators';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

export const googleSheetsCreatorRosterItemSchema = z.object({
  ext_id: z.string().nullable(),
  name: z.string(),
  email: z.string().nullable(),
  email_verified: z.boolean().nullable(),
  image: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  role: z.string().nullable(),
  banned: z.boolean(),
  ban_reason: z.string().nullable(),
  ban_expires: z.string().nullable(),
  mc_name: z.string(),
  mc_id: z.string(),
  user_id: z.string().nullable(),
});

export type GoogleSheetsCreatorRosterItem = z.infer<typeof googleSheetsCreatorRosterItemSchema>;

export class GoogleSheetsCreatorRosterItemDto extends createZodDto(googleSheetsCreatorRosterItemSchema) {}

@Controller('google-sheets/studios/:studioId/creators')
@SkipThrottle()
export class GoogleSheetsCreatorController extends BaseGoogleSheetsController {
  constructor(
    private readonly studioCreatorService: StudioCreatorService,
  ) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'List active MC creator roster for Google Sheets mapping',
    description: 'Returns all active studio creators with user profile information formatted for Google Sheet mc_users tab.',
  })
  @ApiZodResponse(
    z.array(googleSheetsCreatorRosterItemSchema),
    'List of active creators with user information',
  )
  @ZodSerializerDto([GoogleSheetsCreatorRosterItemDto])
  async getCreatorRoster(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    studioId: string,
  ): Promise<GoogleSheetsCreatorRosterItem[]> {
    const roster = await this.studioCreatorService.listActiveRosterWithLinkedUsers(studioId);

    return roster.map((entry) => ({
      ext_id: entry.extId,
      name: entry.name,
      email: entry.email,
      email_verified: entry.emailVerified,
      image: entry.image,
      created_at: entry.createdAt.toISOString(),
      updated_at: entry.updatedAt.toISOString(),
      role: entry.role,
      banned: entry.banned,
      ban_reason: entry.banReason,
      ban_expires: entry.banExpires,
      mc_name: entry.mcName,
      mc_id: entry.mcId,
      user_id: entry.userId,
    }));
  }
}
