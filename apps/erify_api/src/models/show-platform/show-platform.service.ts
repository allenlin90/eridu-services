import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

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
   * Bulk lookup of active (non-soft-deleted) show platforms by UID,
   * scoped to a single `showId`. Used by the extraction pipeline so a
   * platform that was reassigned to a different show between submission
   * and extraction is correctly treated as stale for the current run —
   * filtering only by UID + `deletedAt` would let the cross-show row
   * leak into the audit-target / collision path and misclassify what
   * should be a `skipped_stale_target` outcome.
   *
   * Returns a Map keyed by the requested UID; UIDs that don't resolve
   * under the active + same-show filter are simply absent from the map.
   */
  async findActiveByUids(
    uids: string[],
    showId: bigint,
  ): Promise<Map<string, { id: bigint; showId: bigint }>> {
    if (uids.length === 0) {
      return new Map();
    }
    const rows = await this.showPlatformRepository.findMany({
      where: { uid: { in: uids }, showId, deletedAt: null },
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
   *
   * Per Codex P2 review on PR #103: the write is scoped to
   * `{ uid, deletedAt: null }` via `updateMany`, so a `ShowPlatform` that
   * was soft-deleted between the stale-target prefetch and this write
   * doesn't get mutated and audited as if it were still active. When the
   * race fires (`count === 0`), throw `NotFoundException` so the
   * extractor / paired processor can convert it to the same
   * `target_stale` outcome that the prefetch path uses.
   *
   * Per follow-up Codex P1 review: `showId` is part of the write
   * predicate too. A `ShowPlatform` reassigned to another show between
   * the read and the write would otherwise be mutated under the original
   * task's audit context — the new stale-target contract must cover
   * cross-show reassignments, not just soft-deletes.
   */
  async updateActuals(
    uid: string,
    showId: bigint,
    payload: { actualStartTime?: Date; actualEndTime?: Date; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const result = await this.showPlatformRepository.updateMany(
      { uid, showId, deletedAt: null },
      {
        ...(payload.actualStartTime !== undefined ? { actualStartTime: payload.actualStartTime } : {}),
        ...(payload.actualEndTime !== undefined ? { actualEndTime: payload.actualEndTime } : {}),
        ...(payload.metadata !== undefined ? { metadata: payload.metadata as never } : {}),
      },
    );
    if (result.count === 0) {
      throw HttpError.notFound('ShowPlatform', uid);
    }
  }

  /**
   * Partial-update helper for performance metrics extraction.
   * Scoped to showId and active status, throwing NotFoundException on race.
   */
  async updatePerformanceMetrics(
    uid: string,
    showId: bigint,
    payload: {
      gmv?: Prisma.Decimal | null;
      ctr?: Prisma.Decimal | null;
      cto?: Prisma.Decimal | null;
      viewerCount?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const result = await this.showPlatformRepository.updateMany(
      { uid, showId, deletedAt: null },
      {
        ...(payload.gmv !== undefined ? { gmv: payload.gmv } : {}),
        ...(payload.ctr !== undefined ? { ctr: payload.ctr } : {}),
        ...(payload.cto !== undefined ? { cto: payload.cto } : {}),
        ...(payload.viewerCount !== undefined ? { viewerCount: payload.viewerCount } : {}),
        ...(payload.metadata !== undefined ? { metadata: payload.metadata as never } : {}),
      },
    );
    if (result.count === 0) {
      throw HttpError.notFound('ShowPlatform', uid);
    }
  }
}
