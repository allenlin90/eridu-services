import { Injectable } from '@nestjs/common';

import type {
  CreateShowPlatformPayload,
  UpdateShowPlatformPayload,
} from './schemas/show-platform.schema';
import { ShowPlatformRepository } from './show-platform.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowPlatformService extends BaseModelService {
  static readonly UID_PREFIX = 'show_plt';
  protected readonly uidPrefix = ShowPlatformService.UID_PREFIX;

  constructor(
    private readonly showPlatformRepository: ShowPlatformRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Generates a show platform UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowPlatformUid(): string {
    return this.generateUid();
  }

  async create(
    payload: CreateShowPlatformPayload,
  ): ReturnType<ShowPlatformRepository['create']> {
    const uid = this.generateUid();

    return this.showPlatformRepository.create({
      liveStreamLink: payload.liveStreamLink ?? null,
      platformShowId: payload.platformShowId ?? null,
      viewerCount: payload.viewerCount ?? 0,
      metadata: payload.metadata ?? {},
      show: { connect: { uid: payload.showId } },
      platform: { connect: { uid: payload.platformId } },
      uid,
    });
  }

  async findOne(
    ...args: Parameters<ShowPlatformRepository['findByUid']>
  ): ReturnType<ShowPlatformRepository['findByUid']> {
    return this.showPlatformRepository.findByUid(...args);
  }

  async getShowPlatforms(
    ...args: Parameters<ShowPlatformRepository['findPaginated']>
  ): ReturnType<ShowPlatformRepository['findPaginated']> {
    return this.showPlatformRepository.findPaginated(...args);
  }

  async findShowPlatformByShowAndPlatform(
    showId: bigint,
    platformId: bigint,
  ): ReturnType<ShowPlatformRepository['findByShowAndPlatform']> {
    return this.showPlatformRepository.findByShowAndPlatform(showId, platformId);
  }

  async update(
    uid: string,
    payload: UpdateShowPlatformPayload,
  ): ReturnType<ShowPlatformRepository['update']> {
    const data: Parameters<ShowPlatformRepository['update']>[1] = {};

    if (payload.liveStreamLink !== undefined)
      data.liveStreamLink = payload.liveStreamLink;
    if (payload.platformShowId !== undefined)
      data.platformShowId = payload.platformShowId;
    if (payload.viewerCount !== undefined)
      data.viewerCount = payload.viewerCount;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.showId !== undefined) {
      data.show = { connect: { uid: payload.showId } };
    }

    if (payload.platformId !== undefined) {
      data.platform = { connect: { uid: payload.platformId } };
    }

    return this.showPlatformRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowPlatformRepository['softDelete']> {
    return this.showPlatformRepository.softDelete({ uid });
  }

  /**
   * Bulk lookup of active (non-soft-deleted) show platforms by UID. Used by
   * the extraction pipeline to resolve a batch of hydrated platform target
   * UIDs in a single round-trip, so per-target stale-target checks don't
   * fan out into per-row queries. Returns a Map keyed by the requested UID;
   * UIDs that don't resolve are simply absent from the map.
   */
  async findActiveByUids(uids: string[]): Promise<Map<string, { id: bigint; showId: bigint }>> {
    if (uids.length === 0) {
      return new Map();
    }
    const rows = await this.showPlatformRepository.findMany({
      where: { uid: { in: uids }, deletedAt: null },
    });
    return new Map(rows.map((row) => [row.uid, { id: row.id, showId: row.showId }]));
  }

  /**
   * Throws when the show platform doesn't exist or has been soft-deleted.
   * Mirrors `ShowService.getShowById` so the extraction pipeline has a
   * uniform "fetch-or-throw" helper across scopes.
   */
  async getShowPlatformById(uid: string): ReturnType<ShowPlatformRepository['findByUid']> {
    const showPlatform = await this.showPlatformRepository.findByUid(uid);
    if (!showPlatform) {
      throw HttpError.notFound('ShowPlatform', uid);
    }
    return showPlatform;
  }

  /**
   * Mirrors `ShowService.ensureValidActualTimeRange`. Validates the MERGED
   * pair after the patch — one-sided updates fall back to the stored other
   * side.
   */
  ensureValidActualTimeRange(
    currentActualStartTime: Date | null | undefined,
    currentActualEndTime: Date | null | undefined,
    dto: { actualStartTime?: Date | null; actualEndTime?: Date | null },
  ): void {
    const nextActualStart = dto.actualStartTime !== undefined
      ? dto.actualStartTime
      : currentActualStartTime ?? null;
    const nextActualEnd = dto.actualEndTime !== undefined
      ? dto.actualEndTime
      : currentActualEndTime ?? null;

    if (nextActualStart && nextActualEnd && nextActualEnd <= nextActualStart) {
      throw HttpError.badRequest('Actual end time must be after actual start time');
    }
  }

  /**
   * Partial-update helper for the extraction pipeline. Accepts only the
   * actuals columns and metadata (the only fields the extractor needs to
   * mutate) and forwards directly to the repository so we don't relax the
   * public `UpdateShowPlatformPayload` shape used by admin/studio controllers.
   */
  async updateActuals(
    uid: string,
    payload: { actualStartTime?: Date; actualEndTime?: Date; metadata?: Record<string, unknown> },
  ): ReturnType<ShowPlatformRepository['update']> {
    return this.showPlatformRepository.update({ uid }, {
      ...(payload.actualStartTime !== undefined ? { actualStartTime: payload.actualStartTime } : {}),
      ...(payload.actualEndTime !== undefined ? { actualEndTime: payload.actualEndTime } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata as never } : {}),
    });
  }
}
