import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getTaskContentReasonKey, type UiSchema } from '@eridu/api-types/task-management';

import { JsonForm } from '../json-form';

describe('jsonForm', () => {
  it('captures explanation text in the field reason sidecar key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const schema: UiSchema = {
      items: [
        {
          id: 'fld_setup_status',
          key: 'setup_status',
          type: 'text',
          label: 'Setup status',
          required: true,
          validation: {
            require_reason: 'always',
          },
        },
      ],
    };

    render(<JsonForm schema={schema} values={{}} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText('Setup status'), 'Audio issue');
    await user.type(screen.getByLabelText('Explanation for Setup status'), 'Mixer profile was not loaded');

    await waitFor(() => {
      const latestValues = onChange.mock.calls.at(-1)?.[0];
      expect(latestValues).toMatchObject({
        setup_status: 'Audio issue',
        [getTaskContentReasonKey('setup_status')]: 'Mixer profile was not loaded',
      });
    });
  });

  it('shows conditional explanations only when the triggering value is present', () => {
    const schema: UiSchema = {
      items: [
        {
          id: 'fld_live_title',
          key: 'live_title',
          type: 'select',
          label: 'Live title',
          options: [
            { value: 'correct', label: 'Correct' },
            { value: 'not_correct', label: 'Not correct' },
          ],
          validation: {
            require_reason: [{ op: 'neq', value: 'correct' }],
          },
        },
      ],
    };

    const { rerender } = render(<JsonForm schema={schema} values={{ live_title: '' }} onChange={vi.fn()} />);

    expect(screen.queryByLabelText('Explanation for Live title')).not.toBeInTheDocument();

    rerender(<JsonForm schema={schema} values={{ live_title: 'not_correct' }} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Explanation for Live title')).toBeInTheDocument();
  });
});
