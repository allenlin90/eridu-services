import { createZodDto } from 'nestjs-zod';

import {
  createSceneQcReviewAmendmentInputSchema,
  type SceneQcReviewAmendment,
} from '@eridu/api-types/scene-qc';

import type { PinnedFindingInput } from './scene-qc-review.schema';

export const createSceneQcReviewAmendmentSchema = createSceneQcReviewAmendmentInputSchema.transform((data) => ({
  note: data.note,
  result: data.result ?? null,
  findings: data.findings,
}));

export class CreateSceneQcReviewAmendmentDto extends createZodDto(createSceneQcReviewAmendmentSchema) {}

export type CreateSceneQcReviewAmendmentPayload = {
  note: string;
  result: 'PASS' | 'MINOR' | 'FAIL' | null;
  findings: Array<{
    element_id: string;
    defect_id: string;
    related_element_id?: string | null;
  }>;
};

export type SceneQcAmendmentRecord = {
  uid: string;
  revision: number;
  result: 'PASS' | 'MINOR' | 'FAIL' | null;
  note: string;
  createdBy: { uid: string; name: string };
  createdAt: Date;
  findings: Array<{
    element: { uid: string };
    elementKey: string;
    elementLabel: string;
    defect: { uid: string };
    defectKey: string;
    defectLabel: string;
    relatedElement: { uid: string } | null;
    relatedElementKey: string | null;
    relatedElementLabel: string | null;
  }>;
};

export type CreateAmendmentPersistenceInput = {
  uid: string;
  reviewId: bigint;
  result: 'PASS' | 'MINOR' | 'FAIL' | null;
  note: string;
  createdById: bigint;
  findings: PinnedFindingInput[];
};

export function toSceneQcAmendmentDto(record: SceneQcAmendmentRecord): SceneQcReviewAmendment {
  return {
    id: record.uid,
    revision: record.revision,
    result: record.result,
    note: record.note,
    findings: record.findings.map((finding) => ({
      element_id: finding.element.uid,
      element_key: finding.elementKey,
      element_label: finding.elementLabel,
      defect_id: finding.defect.uid,
      defect_key: finding.defectKey,
      defect_label: finding.defectLabel,
      related_element_id: finding.relatedElement?.uid ?? null,
      related_element_key: finding.relatedElementKey,
      related_element_label: finding.relatedElementLabel,
    })),
    created_by: { id: record.createdBy.uid, name: record.createdBy.name },
    created_at: record.createdAt.toISOString(),
  };
}
