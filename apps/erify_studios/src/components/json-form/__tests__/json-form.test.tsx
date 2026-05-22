import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  getTaskContentExtraKey,
  getTaskContentReasonKey,
  hydrateTaskFormSchema,
  type UiSchema,
  type UiSchemaV2,
} from '@eridu/api-types/task-management';

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

  it('blocks v2 submission when a triggered explanation is empty', async () => {
    const onSubmit = vi.fn();
    const schema: UiSchemaV2 = {
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_livetitle1',
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

    const { container } = render(
      <JsonForm
        schema={schema}
        values={{ fld_livetitle1: 'not_correct' }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Explanation is required for "Live title"')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    { op: 'lte' as const, target: '2026-05-01', triggering: '2026-05-01', nonTriggering: '2026-05-10' },
    { op: 'gte' as const, target: '2026-05-01', triggering: '2026-05-01', nonTriggering: '2026-04-10' },
    { op: 'neq' as const, target: '2026-05-01', triggering: '2026-05-02', nonTriggering: '2026-05-01' },
  ])('shows date explanation when value satisfies $op', ({ op, target, triggering, nonTriggering }) => {
    const schema: UiSchema = {
      items: [
        {
          id: 'fld_show_date',
          key: 'show_date',
          type: 'date',
          label: 'Show date',
          validation: {
            require_reason: [{ op, value: target }],
          },
        },
      ],
    };

    const { rerender } = render(
      <JsonForm schema={schema} values={{ show_date: nonTriggering }} onChange={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Explanation for Show date')).not.toBeInTheDocument();

    rerender(<JsonForm schema={schema} values={{ show_date: triggering }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Explanation for Show date')).toBeInTheDocument();
  });

  it('renders one hydrated input per assigned creator for system_fact_key bindings', () => {
    const schema: UiSchemaV2 = {
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_attendmiss1',
          key: 'attendance_missing',
          type: 'checkbox',
          label: 'Creator attendance missing',
          required: false,
          system_fact_key: 'creator_attendance_missing',
        },
      ],
    };

    const hydrated = hydrateTaskFormSchema(
      schema,
      {
        creators: [
          { uid: 'show_mc_alpha', label: 'Alice' },
          { uid: 'show_mc_beta', label: 'Bob' },
        ],
        platforms: [],
      },
      {},
    );

    render(<JsonForm schema={hydrated as unknown as UiSchemaV2} values={{}} onChange={vi.fn()} />);

    expect(screen.getByText(/Creator attendance missing — Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Creator attendance missing — Bob/)).toBeInTheDocument();
  });

  it('marks stale hydrated items with a read-only dimmed indicator', () => {
    const schema: UiSchemaV2 = {
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        {
          id: 'fld_attendmiss1',
          key: 'attendance_missing',
          type: 'checkbox',
          label: 'Creator attendance missing',
          required: false,
          system_fact_key: 'creator_attendance_missing',
        },
      ],
    };

    const hydrated = hydrateTaskFormSchema(
      schema,
      { creators: [{ uid: 'show_mc_alpha', label: 'Alice' }], platforms: [] },
      // Bob was previously assigned and the operator recorded a value, but Bob
      // is no longer on the show.
      { fld_attendmiss1__creator__show_mc_beta: true },
    );

    const { container } = render(
      <JsonForm schema={hydrated as unknown as UiSchemaV2} values={{ fld_attendmiss1__creator__show_mc_beta: true }} onChange={vi.fn()} />,
    );

    const staleNode = container.querySelector('[data-binding-stale="true"]');
    expect(staleNode).not.toBeNull();
    expect(staleNode!.className).toContain('opacity-50');
    expect(staleNode!.textContent).toContain('Target no longer assigned');
  });

  it('shows stored extra input metadata alongside the selected answer', () => {
    const schema: UiSchema = {
      items: [
        {
          id: 'fld_setup_status',
          key: 'setup_status',
          type: 'text',
          label: 'Setup status',
          required: true,
        },
      ],
    };

    render(
      <JsonForm
        schema={schema}
        values={{
          setup_status: 'Audio issue',
          [getTaskContentExtraKey('setup_status')]: {
            cause: 'Wrong mixer profile',
            reported_by: 'Operator A',
          },
        }}
        onChange={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getByDisplayValue('Audio issue')).toBeInTheDocument();
    expect(screen.getByText('Extra for Setup status')).toBeInTheDocument();
    expect(screen.getByText('Cause: Wrong mixer profile')).toBeInTheDocument();
    expect(screen.getByText('Reported By: Operator A')).toBeInTheDocument();
  });
});
