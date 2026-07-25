import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminUserController } from '@/admin/users/admin-user.controller';
import { AppModule } from '@/app.module';
import { BackdoorUserController } from '@/backdoor/users/backdoor-user.controller';
import { GoogleSheetsCreatorController } from '@/google-sheets/creators/google-sheets-creator.controller';
import { ProfileController } from '@/me/profile/profile.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { StudioShowController } from '@/studios/studio-show/studio-show.controller';

describe('HTTP application module graph', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    } else {
      await moduleRef?.close();
    }
  });

  it('boots every composition-root child with the real Prisma provider', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    expect(app.get(AdminUserController)).toBeInstanceOf(AdminUserController);
    expect(app.get(BackdoorUserController)).toBeInstanceOf(BackdoorUserController);
    expect(app.get(GoogleSheetsCreatorController)).toBeInstanceOf(
      GoogleSheetsCreatorController,
    );
    expect(app.get(ProfileController)).toBeInstanceOf(ProfileController);
    expect(app.get(StudioShowController)).toBeInstanceOf(StudioShowController);
    await expect(
      app.get(PrismaService).isHealthy(),
    ).resolves.toBe(true);
  });
});
