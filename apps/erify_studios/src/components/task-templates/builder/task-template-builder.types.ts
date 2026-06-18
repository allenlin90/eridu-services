import type { SharedField } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType } from './schema';

export type TaskTemplateBuilderProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  onSave?: (data: BuilderTemplateSchemaType) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  errors?: Record<string, string[]>;
  sharedFields?: SharedField[];
  studioId?: string;
};

/** Title/description preview describing how a selected shared field will be inserted. */
export type SharedFieldInsertionPreview = {
  title: string;
  description: string;
};
