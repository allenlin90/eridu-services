import 'reflect-metadata';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('HTTP application module graph', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('boots every composition-root child with the real Prisma provider', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleRef.init();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
    await expect(
      moduleRef.get(PrismaService).isHealthy(),
    ).resolves.toBe(true);
  });
});
