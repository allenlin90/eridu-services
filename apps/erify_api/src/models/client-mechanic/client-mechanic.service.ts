import { Injectable } from '@nestjs/common';

import type {
  CreateClientMechanicPayload,
  UpdateClientMechanicPayload,
} from './schemas/client-mechanic.schema';
import {
  clientMechanicDefaultInclude,
  ClientMechanicRepository,
} from './client-mechanic.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { parseModeratorSnapshot } from '@/studios/studio-performance/schemas/moderator-snapshot.schema';
import { UtilityService } from '@/utility/utility.service';

type MechanicScope = {
  mechanicUid: string;
  clientUid: string;
};

function metadataMatches(
  payloadMetadata: Record<string, any> | undefined,
  existingMetadata: unknown,
) {
  return payloadMetadata === undefined
    || JSON.stringify(payloadMetadata) === JSON.stringify(existingMetadata ?? {});
}

/**
 * Service for managing ClientMechanic entities — client-owned reusable
 * moderation instructions assignable into task-template loops.
 */
@Injectable()
export class ClientMechanicService extends BaseModelService {
  static readonly UID_PREFIX = 'cmech';
  protected readonly uidPrefix = ClientMechanicService.UID_PREFIX;

  constructor(
    private readonly clientMechanicRepository: ClientMechanicRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a mechanic for a client. The owning client is assumed validated by
   * the controller. Authorship history is not denormalized on the row; trace
   * it via the Audit model if a future flow needs it.
   */
  async createMechanic(
    clientUid: string,
    payload: CreateClientMechanicPayload,
  ): ReturnType<ClientMechanicRepository['create']> {
    return this.clientMechanicRepository.create(
      {
        uid: this.generateUid(),
        title: payload.title,
        instructionLabel: payload.instructionLabel,
        instructionBody: payload.instructionBody,
        metadata: payload.metadata ?? {},
        client: { connect: { uid: clientUid } },
      },
      clientMechanicDefaultInclude,
    );
  }

  /**
   * Reads a client-scoped mechanic by UID. Returns `null` for not-found so the
   * controller can map to a 404.
   */
  getMechanic(scope: MechanicScope) {
    return this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });
  }

  /**
   * Lists a client's mechanics with pagination, status filter, and search.
   */
  listMechanics(
    ...args: Parameters<ClientMechanicRepository['findPaginated']>
  ): ReturnType<ClientMechanicRepository['findPaginated']> {
    return this.clientMechanicRepository.findPaginated(...args);
  }

  /**
   * Updates a mechanic's content / status. Bumps the optimistic-lock `version`
   * on every change and the monotonic `contentRevision` only when the
   * moderator-facing instruction (label or body) actually changes. Returns
   * `null` for not-found; throws 409 on stale `version`.
   */
  async updateMechanic(scope: MechanicScope, payload: UpdateClientMechanicPayload) {
    const existing = await this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });

    if (!existing) {
      return null;
    }

    const data = {
      ...(payload.title !== undefined && payload.title !== existing.title && { title: payload.title }),
      ...(payload.instructionLabel !== undefined
        && payload.instructionLabel !== existing.instructionLabel
        && { instructionLabel: payload.instructionLabel }),
      ...(payload.instructionBody !== undefined
        && payload.instructionBody !== existing.instructionBody
        && { instructionBody: payload.instructionBody }),
      ...(payload.status !== undefined && payload.status !== existing.status && { status: payload.status }),
      ...(!metadataMatches(payload.metadata, existing.metadata) && { metadata: payload.metadata }),
    };

    if (Object.keys(data).length === 0) {
      return existing;
    }

    const contentChanged = data.instructionLabel !== undefined || data.instructionBody !== undefined;
    const updateData = {
      ...data,
      version: existing.version + 1,
      ...(contentChanged && { contentRevision: existing.contentRevision + 1 }),
    };

    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: payload.version },
        updateData,
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          'Client mechanic record is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Retires a mechanic (soft, reversible lifecycle). Idempotent: retiring an
   * already-retired mechanic is a no-op that still returns the row. Returns
   * `null` for not-found; throws 409 when a concurrent edit raced the retire.
   * Hard-delete is intentionally not exposed — mechanics are kept for
   * coverage/history once referenced.
   */
  async retireMechanic(scope: MechanicScope) {
    const existing = await this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });

    if (!existing) {
      return null;
    }

    if (existing.status === 'retired') {
      return existing;
    }

    // Guard the retire with the just-read `version`. DELETE carries no client
    // version (unlike the PATCH status='retired' path), so without this guard a
    // content edit landing between the read and the write would be lost and the
    // `version` counter would collide. Surfacing the race as a 409 keeps the
    // optimistic-lock invariant intact; the rare retry re-reads and succeeds.
    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: existing.version },
        { status: 'retired', version: existing.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          'Client mechanic record is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Soft-deletes a client mechanic. Returns `null` when the mechanic does not
   * exist or is not under the client; throws 409 when a concurrent edit raced
   * the delete (same race window as `retireMechanic`, since DELETE also
   * carries no client version).
   *
   * Reference guard: `TaskTemplateMechanicRef` (PR 20.5) does not exist yet at
   * this point in the rollout, so there is nothing a mechanic can be referenced
   * by — a hard-delete is safe today. PR 20.5 must add a referenced-mechanic
   * check here once that link table lands, mirroring the retire-instead
   * intent for any mechanic actually assigned into a template.
   */
  async deleteMechanic(scope: MechanicScope) {
    const existing = await this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });

    if (!existing) {
      return null;
    }

    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: existing.version },
        { deletedAt: new Date(), version: existing.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          'Client mechanic record is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  async getMechanicCoverage(
    studioUid: string,
    clientUid: string,
    mechanicUid: string,
    startDate: Date,
    endDate: Date,
  ) {
    const mechanic = await this.clientMechanicRepository.findByUidForClient({
      uid: mechanicUid,
      clientUid,
    });
    if (!mechanic) {
      throw HttpError.notFound('Client mechanic');
    }

    // 1. Find all templates referencing this mechanic
    const refs = await this.clientMechanicRepository.findTemplatesByMechanic(mechanic.id);

    // Group by template UID to construct the templates array
    const templateMap = new Map<string, { uid: string; name: string; is_latest_carrying: boolean }>();
    for (const ref of refs) {
      if (!ref.template) {
        continue;
      }
      const existing = templateMap.get(ref.template.uid);
      const isLatest = ref.snapshotId === null;
      if (existing) {
        if (isLatest) {
          existing.is_latest_carrying = true;
        }
      } else {
        templateMap.set(ref.template.uid, {
          uid: ref.template.uid,
          name: ref.template.name,
          is_latest_carrying: isLatest,
        });
      }
    }
    const templates = Array.from(templateMap.values());

    // 2. Find shows for the client in the date range, scoped to this studio
    const shows = await this.clientMechanicRepository.findShowsForCoverage(studioUid, clientUid, startDate, endDate);
    if (shows.length === 0) {
      return { templates, shows: [] };
    }

    // 3. Batch query finalized loop-bearing tasks for these shows
    const showIds = shows.map((s) => s.id);
    const tasks = await this.clientMechanicRepository.findFinalizedLoopTasksForShows(showIds);

    // Group tasks by show ID
    const tasksByShowId = new Map<string, typeof tasks>();
    for (const task of tasks) {
      for (const target of task.targets) {
        if (target.showId === null) {
          continue;
        }
        const key = target.showId.toString();
        let list = tasksByShowId.get(key);
        if (!list) {
          list = [];
          tasksByShowId.set(key, list);
        }
        list.push(task);
      }
    }

    // 4. Batch query TaskTemplateMechanicRef for these templates and snapshots
    const templateIds = Array.from(new Set(refs.map((r) => r.templateId)));
    const snapshotIds = Array.from(new Set(tasks.map((t) => t.snapshotId).filter((id): id is bigint => id !== null)));

    const refRows = await this.clientMechanicRepository.findTemplateRefsForTemplatesAndSnapshots(
      templateIds,
      snapshotIds,
    );

    // Build helper sets/maps for fast lookup:
    // templateId -> set of mechanicIds (for latest version)
    const latestTemplateRefs = new Map<string, Set<string>>();
    // snapshotId -> set of mechanicIds
    const snapshotRefs = new Map<string, Set<string>>();

    for (const row of refRows) {
      const mechanicUidStr = row.mechanic.uid;
      if (row.snapshotId === null) {
        const key = row.templateId.toString();
        let set = latestTemplateRefs.get(key);
        if (!set) {
          set = new Set();
          latestTemplateRefs.set(key, set);
        }
        set.add(mechanicUidStr);
      } else {
        const key = row.snapshotId.toString();
        let set = snapshotRefs.get(key);
        if (!set) {
          set = new Set();
          snapshotRefs.set(key, set);
        }
        set.add(mechanicUidStr);
      }
    }

    // 5. List only shows whose authoritative moderation task includes this mechanic.
    const coverageShows = shows.flatMap((show) => {
      const showTasks = tasksByShowId.get(show.id.toString()) ?? [];

      // Find the latest finalized loop-bearing task
      let authoritativeTask: typeof showTasks[0] | null = null;
      for (const t of showTasks) {
        const { loops } = parseModeratorSnapshot(t.snapshot?.schema);
        if (loops !== null) {
          authoritativeTask = t;
          break;
        }
      }

      if (!authoritativeTask || !authoritativeTask.snapshotId || !authoritativeTask.templateId) {
        return [];
      }

      const snapshotIdKey = authoritativeTask.snapshotId.toString();
      const templateIdKey = authoritativeTask.templateId.toString();

      const hasSnapshotRef = snapshotRefs.get(snapshotIdKey)?.has(mechanic.uid) ?? false;
      const hasLatestRef = latestTemplateRefs.get(templateIdKey)?.has(mechanic.uid) ?? false;

      let status: 'current' | 'stale' | 'dropped' = 'dropped';
      let frozenRevision: number | null = null;

      if (hasSnapshotRef) {
        // Extract frozen revision from snapshot schema
        const { items } = parseModeratorSnapshot(authoritativeTask.snapshot?.schema);
        const item = items.find(
          (it: any) =>
            it.mechanic_ref
            && it.mechanic_ref.mechanic_id === mechanic.uid,
        );
        frozenRevision = (item?.mechanic_ref as any)?.content_revision ?? null;

        if (hasLatestRef) {
          if (frozenRevision === mechanic.contentRevision) {
            status = 'current';
          } else {
            status = 'stale';
          }
        } else {
          status = 'dropped';
        }
      } else {
        return [];
      }

      const templateName = authoritativeTask.template?.name ?? null;
      const templateUid = authoritativeTask.template?.uid ?? null;

      return [{
        uid: show.uid,
        name: show.name,
        start_time: show.startTime.toISOString(),
        status,
        task_uid: authoritativeTask.uid,
        template_uid: templateUid,
        template_name: templateName,
        frozen_revision: frozenRevision,
        catalog_revision: mechanic.contentRevision,
      }];
    });

    return { templates, shows: coverageShows };
  }

  async getShowMechanicsCoverage(studioUid: string, showUid: string) {
    // 1. Find the show
    const show = await this.clientMechanicRepository.findShowForCoverageDetail(studioUid, showUid);

    if (!show) {
      throw HttpError.notFound('Show');
    }

    // 2. Find finalized tasks for the show
    const tasks = await this.clientMechanicRepository.findFinalizedLoopTasksForShows([show.id]);

    // Find the latest finalized loop-bearing task
    let authoritativeTask: typeof tasks[0] | null = null;
    for (const t of tasks) {
      const { loops } = parseModeratorSnapshot(t.snapshot?.schema);
      if (loops !== null) {
        authoritativeTask = t;
        break;
      }
    }

    if (!authoritativeTask || !authoritativeTask.snapshotId || !authoritativeTask.templateId) {
      return {
        show_uid: show.uid,
        show_name: show.name,
        client_uid: show.client?.uid ?? null,
        client_name: show.client?.name ?? null,
        task_uid: null,
        template_uid: null,
        template_name: null,
        mechanics: [],
      };
    }

    // 3. Query all TaskTemplateMechanicRef for this templateId and snapshotId
    const refs = await this.clientMechanicRepository.findTemplateRefsForShowCoverage(
      authoritativeTask.templateId,
      authoritativeTask.snapshotId,
    );

    // Build unique list of mechanics involved
    const mechanicMap = new Map<string, typeof refs[0]['mechanic']>();
    const latestTemplateRefs = new Set<string>();
    const snapshotRefs = new Set<string>();

    for (const ref of refs) {
      const mech = ref.mechanic;
      mechanicMap.set(mech.uid, mech);

      if (ref.snapshotId === null) {
        latestTemplateRefs.add(mech.uid);
      } else {
        snapshotRefs.add(mech.uid);
      }
    }

    // 4. Compute status for each mechanic
    const { items } = parseModeratorSnapshot(authoritativeTask.snapshot?.schema);

    const mechanicsCoverage = Array.from(mechanicMap.values()).map((mechanic) => {
      const hasSnapshotRef = snapshotRefs.has(mechanic.uid);

      let status: 'current' | 'stale' | 'missing' = 'missing';
      let frozenRevision: number | null = null;

      if (hasSnapshotRef) {
        // Find frozen revision in snapshot schema
        const item = items.find(
          (it: any) =>
            it.mechanic_ref
            && it.mechanic_ref.mechanic_id === mechanic.uid,
        );
        frozenRevision = (item?.mechanic_ref as any)?.content_revision ?? null;

        if (frozenRevision === mechanic.contentRevision) {
          status = 'current';
        } else {
          status = 'stale';
        }
      } else {
        status = 'missing';
      }

      return {
        uid: mechanic.uid,
        title: mechanic.title,
        instruction_label: mechanic.instructionLabel,
        instruction_body: mechanic.instructionBody,
        status,
        frozen_revision: frozenRevision,
        catalog_revision: mechanic.contentRevision,
        catalog_status: mechanic.status,
      };
    });

    return {
      show_uid: show.uid,
      show_name: show.name,
      client_uid: show.client?.uid ?? null,
      client_name: show.client?.name ?? null,
      task_uid: authoritativeTask.uid,
      template_uid: authoritativeTask.template?.uid ?? null,
      template_name: authoritativeTask.template?.name ?? null,
      mechanics: mechanicsCoverage,
    };
  }
}
