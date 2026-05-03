import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BuilderTemplateSchemaType } from '../schema';
import { TaskTemplateBuilder } from '../task-template-builder';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: () => ({ hasAccess: () => false }),
}));

describe('taskTemplateBuilder v2 field ids', () => {
  it('uses path-safe field ids when adding a field to a v2 loop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const template: BuilderTemplateSchemaType = {
      name: 'V2 moderation template',
      description: '',
      task_type: 'ACTIVE',
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      metadata: {
        loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
      },
      items: [],
    };

    render(<TaskTemplateBuilder template={template} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add First Field' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          id: expect.stringMatching(/^fld_[a-z0-9]{10,}$/),
          group: 'l1',
        }),
      ],
    }));
  });
});
