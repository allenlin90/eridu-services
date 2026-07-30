import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import { sceneTypeSchema } from './schemas.js';

export const sceneQcTaxonomyDefectSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_DEFECT),
  key: z.string(),
  label: z.string(),
  is_system: z.boolean(),
  retired_at: z.iso.datetime().nullable(),
});

export const sceneQcTaxonomyElementSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT),
  key: z.string(),
  label: z.string(),
  applies_to: z.array(sceneTypeSchema).min(1),
  is_system: z.boolean(),
  retired_at: z.iso.datetime().nullable(),
  defects: z.array(sceneQcTaxonomyDefectSchema),
});

export const sceneQcTaxonomySchema = z.object({
  elements: z.array(sceneQcTaxonomyElementSchema),
});

export const sceneQcFindingInputSchema = z.object({
  element_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT),
  defect_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_DEFECT),
  related_element_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT).nullable().optional(),
});

export const sceneQcFindingSchema = z.object({
  element_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT),
  element_key: z.string(),
  element_label: z.string(),
  defect_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_DEFECT),
  defect_key: z.string(),
  defect_label: z.string(),
  related_element_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT).nullable(),
  related_element_key: z.string().nullable(),
  related_element_label: z.string().nullable(),
});

export const createSceneQcTaxonomyElementInputSchema = z.object({
  label: z.string().trim().min(1).max(100),
  applies_to: z.array(sceneTypeSchema).min(1),
});

export const createSceneQcTaxonomyDefectInputSchema = z.object({
  element_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_TAXONOMY_ELEMENT),
  label: z.string().trim().min(1).max(100),
});

export type SceneQcTaxonomy = z.infer<typeof sceneQcTaxonomySchema>;
export type SceneQcTaxonomyElement = z.infer<typeof sceneQcTaxonomyElementSchema>;
export type SceneQcTaxonomyDefect = z.infer<typeof sceneQcTaxonomyDefectSchema>;
export type SceneQcFindingInput = z.infer<typeof sceneQcFindingInputSchema>;
export type SceneQcFinding = z.infer<typeof sceneQcFindingSchema>;
export type CreateSceneQcTaxonomyElementInput = z.infer<typeof createSceneQcTaxonomyElementInputSchema>;
export type CreateSceneQcTaxonomyDefectInput = z.infer<typeof createSceneQcTaxonomyDefectInputSchema>;
