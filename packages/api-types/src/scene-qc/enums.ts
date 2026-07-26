import { z } from 'zod';

/**
 * Lifecycle status shared by `SceneMaterial` and `SceneProfile`.
 *
 * `ACTIVE` resources are assignable/selectable; `RETIRED` resources are kept
 * for history but hidden from new assignment. Retire is reversible; it is
 * distinct from soft-delete (`deleted_at`).
 */
export const SCENE_QC_STATUS = {
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type SceneQcStatus = (typeof SCENE_QC_STATUS)[keyof typeof SCENE_QC_STATUS];

export const sceneQcStatusSchema = z.enum(
  Object.values(SCENE_QC_STATUS) as [SceneQcStatus, ...SceneQcStatus[]],
);

/**
 * Physical setup of a Scene Profile. Pinned on every profile revision so
 * Stage 3 structured findings can apply the right vocabulary without a
 * profile-history migration. See docs/prd/scene-qc.md "Taxonomy and
 * Structured Findings".
 */
export const SCENE_TYPE = {
  GRAPHIC_BG: 'GRAPHIC_BG',
  REAL_BACKDROP: 'REAL_BACKDROP',
} as const;

export type SceneType = (typeof SCENE_TYPE)[keyof typeof SCENE_TYPE];

export const sceneTypeSchema = z.enum(
  Object.values(SCENE_TYPE) as [SceneType, ...SceneType[]],
);

/**
 * How a Show's expected Scene Profile was resolved: an explicit Show
 * assignment wins, otherwise the Client's active default, otherwise no
 * profile (a warning, not a blocker — see docs/prd/scene-qc.md "Evidence
 * Requirements").
 */
export const SCENE_PROFILE_RESOLUTION_SOURCE = {
  SHOW_ASSIGNMENT: 'SHOW_ASSIGNMENT',
  CLIENT_DEFAULT: 'CLIENT_DEFAULT',
  NONE: 'NONE',
} as const;

export type SceneProfileResolutionSource =
  (typeof SCENE_PROFILE_RESOLUTION_SOURCE)[keyof typeof SCENE_PROFILE_RESOLUTION_SOURCE];

export const sceneProfileResolutionSourceSchema = z.enum(
  Object.values(SCENE_PROFILE_RESOLUTION_SOURCE) as [
    SceneProfileResolutionSource,
    ...SceneProfileResolutionSource[],
  ],
);
