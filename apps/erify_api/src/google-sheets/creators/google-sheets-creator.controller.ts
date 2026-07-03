import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';

import { BaseGoogleSheetsController } from '../base-google-sheets.controller';

import { ApiZodResponse } from '@/lib/openapi/decorators';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

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
    private readonly studioCreatorRepository: StudioCreatorRepository,
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
    const roster = await this.studioCreatorRepository.findActiveRosterWithUser(studioId);

    return roster.map((item) => {
      const creator = item.creator;
      const user = creator.user;

      const userMetadata = (user?.metadata as Record<string, any>) ?? {};

      // If email_verified is not explicitly in metadata, we fallback to true if the linked user exists
      const emailVerified = user
        ? (userMetadata.email_verified ?? userMetadata.emailVerified ?? true)
        : null;

      const role = user ? (userMetadata.role ?? 'user') : null;
      const banReason = user ? (userMetadata.ban_reason ?? userMetadata.banReason ?? null) : null;
      const banExpires = user ? (userMetadata.ban_expires ?? userMetadata.banExpires ?? null) : null;

      return {
        ext_id: user?.extId ?? null,
        name: user?.name ?? creator.name,
        email: user?.email ?? null,
        email_verified: emailVerified,
        image: user?.profileUrl ?? null,
        created_at: (user?.createdAt ?? creator.createdAt).toISOString(),
        updated_at: (user?.updatedAt ?? creator.updatedAt).toISOString(),
        role,
        banned: user?.isBanned ?? false,
        ban_reason: banReason,
        ban_expires: banExpires,
        mc_name: creator.aliasName,
        mc_id: creator.uid,
        user_id: user?.uid ?? null,
      };
    });
  }
}
