import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Prisma } from '@prisma/client';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import type {
  CreateSceneQcTaxonomyDefectInput,
  CreateSceneQcTaxonomyElementInput,
  SceneQcFindingInput,
  SceneQcTaxonomy,
  SceneQcTaxonomyDefect,
  SceneQcTaxonomyElement,
} from '@eridu/api-types/scene-qc';

import type { PinnedFindingInput } from './schemas/scene-qc-review.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';

const taxonomyInclude = {
  defects: { orderBy: [{ isSystem: 'desc' }, { label: 'asc' }] },
} satisfies Prisma.SceneQcTaxonomyElementInclude;

@Injectable()
export class SceneQcTaxonomyService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly uidGenerator: UidGeneratorService,
    private readonly userService: UserService,
  ) {}

  async list(includeRetired = false): Promise<SceneQcTaxonomy> {
    const elements = await this.txHost.tx.sceneQcTaxonomyElement.findMany({
      where: includeRetired ? {} : { retiredAt: null },
      include: taxonomyInclude,
      orderBy: [{ isSystem: 'desc' }, { label: 'asc' }],
    });
    return {
      elements: elements.map((element) => this.toElementDto({
        ...element,
        defects: includeRetired ? element.defects : element.defects.filter((defect) => !defect.retiredAt),
      })),
    };
  }

  async createElement(
    input: CreateSceneQcTaxonomyElementInput,
    actorExtId: string,
  ): Promise<SceneQcTaxonomyElement> {
    const actor = await this.resolveActor(actorExtId);
    const uid = this.uidGenerator.generateBrandedId(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT);
    const element = await this.txHost.tx.sceneQcTaxonomyElement.create({
      data: {
        uid,
        key: uid,
        label: input.label,
        appliesToGraphicBg: input.applies_to.includes('GRAPHIC_BG'),
        appliesToRealBackdrop: input.applies_to.includes('REAL_BACKDROP'),
        createdById: actor.id,
      },
      include: taxonomyInclude,
    });
    return this.toElementDto(element);
  }

  async createDefect(
    input: CreateSceneQcTaxonomyDefectInput,
    actorExtId: string,
  ): Promise<SceneQcTaxonomyDefect> {
    const actor = await this.resolveActor(actorExtId);
    const element = await this.txHost.tx.sceneQcTaxonomyElement.findFirst({
      where: { uid: input.element_id, retiredAt: null },
      select: { id: true },
    });
    if (!element) {
      throw HttpError.notFound('Scene QC taxonomy element');
    }
    const uid = this.uidGenerator.generateBrandedId(UID_PREFIXES.SCENE_QC_TAXONOMY_DEFECT);
    const defect = await this.txHost.tx.sceneQcTaxonomyDefect.create({
      data: {
        uid,
        key: uid,
        label: input.label,
        elementId: element.id,
        createdById: actor.id,
      },
    });
    return this.toDefectDto(defect);
  }

  async retireElement(uid: string): Promise<SceneQcTaxonomyElement> {
    const existing = await this.txHost.tx.sceneQcTaxonomyElement.findUnique({
      where: { uid },
      include: taxonomyInclude,
    });
    if (!existing) {
      throw HttpError.notFound('Scene QC taxonomy element');
    }
    if (existing.isSystem) {
      throw HttpError.forbidden('Built-in Scene QC elements cannot be retired');
    }
    const retiredAt = existing.retiredAt ?? new Date();
    const element = await this.txHost.tx.sceneQcTaxonomyElement.update({
      where: { uid },
      data: {
        retiredAt,
        defects: { updateMany: { where: { retiredAt: null }, data: { retiredAt } } },
      },
      include: taxonomyInclude,
    });
    return this.toElementDto(element);
  }

  async retireDefect(uid: string): Promise<SceneQcTaxonomyDefect> {
    const existing = await this.txHost.tx.sceneQcTaxonomyDefect.findUnique({ where: { uid } });
    if (!existing) {
      throw HttpError.notFound('Scene QC taxonomy defect');
    }
    if (existing.isSystem) {
      throw HttpError.forbidden('Built-in Scene QC defect types cannot be retired');
    }
    return this.toDefectDto(await this.txHost.tx.sceneQcTaxonomyDefect.update({
      where: { uid },
      data: { retiredAt: existing.retiredAt ?? new Date() },
    }));
  }

  async resolveFindings(
    inputs: SceneQcFindingInput[],
    sceneType: 'GRAPHIC_BG' | 'REAL_BACKDROP' | null,
  ): Promise<PinnedFindingInput[]> {
    if (inputs.length === 0) {
      return [];
    }
    if (!sceneType) {
      throw HttpError.badRequest('A Scene Profile with a scene type is required before selecting structured issues');
    }

    const elementUids = new Set(inputs.flatMap((input) => [
      input.element_id,
      ...(input.related_element_id ? [input.related_element_id] : []),
    ]));
    const defectUids = new Set(inputs.map((input) => input.defect_id));
    const [elements, defects] = await Promise.all([
      this.txHost.tx.sceneQcTaxonomyElement.findMany({
        where: { uid: { in: [...elementUids] }, retiredAt: null },
      }),
      this.txHost.tx.sceneQcTaxonomyDefect.findMany({
        where: { uid: { in: [...defectUids] }, retiredAt: null },
      }),
    ]);
    const elementByUid = new Map(elements.map((element) => [element.uid, element]));
    const defectByUid = new Map(defects.map((defect) => [defect.uid, defect]));

    return inputs.map((input, sortOrder) => {
      const element = elementByUid.get(input.element_id);
      const defect = defectByUid.get(input.defect_id);
      const related = input.related_element_id ? elementByUid.get(input.related_element_id) : null;
      if (!element || !defect || defect.elementId !== element.id) {
        throw HttpError.badRequest('Scene QC issue selection is invalid or retired');
      }
      const applies = sceneType === 'GRAPHIC_BG' ? element.appliesToGraphicBg : element.appliesToRealBackdrop;
      if (!applies) {
        throw HttpError.badRequest('Scene QC issue element does not apply to this Scene Profile type');
      }
      const relatedApplies = related
        ? sceneType === 'GRAPHIC_BG'
          ? related.appliesToGraphicBg
          : related.appliesToRealBackdrop
        : true;
      if (!relatedApplies || related?.id === element.id) {
        throw HttpError.badRequest('Scene QC related element is invalid for this Scene Profile type');
      }
      if (defect.key === 'overlap' && !related) {
        throw HttpError.badRequest('Overlap issues require a related element');
      }
      if (defect.key !== 'overlap' && related) {
        throw HttpError.badRequest('Only overlap issues can include a related element');
      }
      return {
        sortOrder,
        elementId: element.id,
        elementKey: element.key,
        elementLabel: element.label,
        defectId: defect.id,
        defectKey: defect.key,
        defectLabel: defect.label,
        relatedElementId: related?.id ?? null,
        relatedElementKey: related?.key ?? null,
        relatedElementLabel: related?.label ?? null,
      };
    });
  }

  private async resolveActor(actorExtId: string): Promise<{ id: bigint }> {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return actor;
  }

  private toElementDto(element: {
    uid: string;
    key: string;
    label: string;
    appliesToGraphicBg: boolean;
    appliesToRealBackdrop: boolean;
    isSystem: boolean;
    retiredAt: Date | null;
    defects: Array<Parameters<SceneQcTaxonomyService['toDefectDto']>[0]>;
  }): SceneQcTaxonomyElement {
    return {
      id: element.uid,
      key: element.key,
      label: element.label,
      applies_to: [
        ...(element.appliesToGraphicBg ? ['GRAPHIC_BG' as const] : []),
        ...(element.appliesToRealBackdrop ? ['REAL_BACKDROP' as const] : []),
      ],
      is_system: element.isSystem,
      retired_at: element.retiredAt?.toISOString() ?? null,
      defects: element.defects.map((defect) => this.toDefectDto(defect)),
    };
  }

  private toDefectDto(defect: {
    uid: string;
    key: string;
    label: string;
    isSystem: boolean;
    retiredAt: Date | null;
  }): SceneQcTaxonomyDefect {
    return {
      id: defect.uid,
      key: defect.key,
      label: defect.label,
      is_system: defect.isSystem,
      retired_at: defect.retiredAt?.toISOString() ?? null,
    };
  }
}
