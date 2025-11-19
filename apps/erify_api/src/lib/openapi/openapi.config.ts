import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

export function setupOpenAPI(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Eridu Services API')
    .setDescription('API documentation for Eridu Services platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Add JSON endpoint for Scalar
  app.use('/swagger-json', (_req: Request, res: Response) => {
    res.json(document);
  });

  // Serve Scalar API Reference
  app.use('/api-reference', (_req: Request, res: Response) => {
    try {
      const scalarHtml = readFileSync(
        join(process.cwd(), 'public', 'scalar.html'),
        'utf8',
      );
      res.send(scalarHtml);
    } catch (_error) {
      res.status(404).send('Scalar documentation not found');
    }
  });

  return document;
}
