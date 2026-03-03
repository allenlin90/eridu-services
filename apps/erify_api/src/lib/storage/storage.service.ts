import { randomUUID } from 'node:crypto';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';
import { HttpError } from '@/lib/errors/http-error.util';

type PresignedUploadInput = {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
};

type PresignedUploadResult = {
  uploadUrl: string;
  uploadMethod: 'PUT';
  uploadHeaders: { contentType: string };
  objectKey: string;
  fileUrl: string;
  expiresInSeconds: number;
};

const DEFAULT_EXPIRY_SECONDS = 300;
const AWS_REGION = 'auto';

@Injectable()
export class StorageService {
  private s3Client: S3Client | null = null;

  constructor(private readonly configService: ConfigService<Env>) {}

  async generatePresignedUploadUrl(input: PresignedUploadInput): Promise<PresignedUploadResult> {
    const endpoint = this.getRequiredConfig('R2_ENDPOINT');
    const bucket = this.getRequiredConfig('R2_BUCKET_NAME');

    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
    if (expiresInSeconds <= 0 || expiresInSeconds > 3600) {
      throw HttpError.badRequest('expiresInSeconds must be between 1 and 3600');
    }

    const parsedEndpoint = this.parseAndValidateR2Endpoint(endpoint);
    const uploadUrl = await getSignedUrl(
      this.getS3Client(parsedEndpoint.origin),
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.objectKey,
        ContentType: input.contentType,
      }),
      { expiresIn: expiresInSeconds },
    );

    return {
      uploadUrl,
      uploadMethod: 'PUT',
      uploadHeaders: { contentType: input.contentType },
      objectKey: input.objectKey,
      fileUrl: this.buildPublicFileUrl(input.objectKey),
      expiresInSeconds,
    };
  }

  generateObjectKey(useCase: string, actorId: string, fileName: string): string {
    const date = new Date().toISOString().slice(0, 10);
    const randomPart = randomUUID().replace(/-/g, '');
    const safeName = this.sanitizeFileName(fileName);
    return `uploads/${useCase.toLowerCase()}/${actorId}/${date}/${randomPart}-${safeName}`;
  }

  private getRequiredConfig(key: keyof Env): string {
    const value = this.configService.get(key, { infer: true });
    if (!value) {
      throw HttpError.internalServerError(`${key} is not configured`);
    }
    if (typeof value !== 'string') {
      throw HttpError.internalServerError(`${key} must be a string`);
    }
    return value;
  }

  private parseAndValidateR2Endpoint(endpoint: string): URL {
    const parsed = new URL(endpoint);
    const validApiDomain = '.r2.cloudflarestorage.com';
    if (!parsed.hostname.endsWith(validApiDomain)) {
      throw HttpError.internalServerError(
        `R2_ENDPOINT must use the R2 S3 API domain (*${validApiDomain})`,
      );
    }

    return parsed;
  }

  private buildPublicFileUrl(objectKey: string): string {
    const publicBaseUrl = this.configService.get('R2_PUBLIC_BASE_URL', { infer: true });
    if (!publicBaseUrl || typeof publicBaseUrl !== 'string') {
      throw HttpError.internalServerError(
        'R2_PUBLIC_BASE_URL must be configured to return a browser-accessible file_url',
      );
    }
    return `${this.trimEndSlashes(publicBaseUrl)}/${this.encodeObjectKey(objectKey)}`;
  }

  private sanitizeFileName(fileName: string): string {
    const cleaned = fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return cleaned || 'file';
  }

  private trimEndSlashes(value: string): string {
    return value.replace(/\/+$/g, '');
  }

  private encodePathSegment(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  private encodeObjectKey(objectKey: string): string {
    return objectKey
      .split('/')
      .map((segment) => this.encodePathSegment(segment))
      .join('/');
  }

  private getS3Client(endpoint: string): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const accessKeyId = this.getRequiredConfig('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.getRequiredConfig('R2_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({
      region: AWS_REGION,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    return this.s3Client;
  }
}
