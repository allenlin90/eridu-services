import { memo } from 'react';

import { TaskFormRenderer } from '../shared/task-form-renderer';

import type { TemplateSchemaType } from './schema';

type LivePreviewProps = {
  template: TemplateSchemaType;
};

export const LivePreview = memo(({ template }: LivePreviewProps) => {
  return <TaskFormRenderer template={template} />;
});
LivePreview.displayName = 'LivePreview';
