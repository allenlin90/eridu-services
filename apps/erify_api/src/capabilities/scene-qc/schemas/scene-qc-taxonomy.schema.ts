import { createZodDto } from 'nestjs-zod';

import {
  createSceneQcTaxonomyDefectInputSchema,
  createSceneQcTaxonomyElementInputSchema,
} from '@eridu/api-types/scene-qc';

export class CreateSceneQcTaxonomyElementDto extends createZodDto(createSceneQcTaxonomyElementInputSchema) {}
export class CreateSceneQcTaxonomyDefectDto extends createZodDto(createSceneQcTaxonomyDefectInputSchema) {}
