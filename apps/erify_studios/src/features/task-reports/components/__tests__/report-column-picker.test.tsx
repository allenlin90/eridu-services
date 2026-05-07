import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TaskReportScope, TaskReportSelectedColumn, TaskReportSourcesResponse } from '@eridu/api-types/task-management';

import { ReportColumnPicker } from '../report-column-picker';

const mockUseTaskReportSources = vi.fn();

vi.mock('../../hooks/use-task-report-sources', () => ({
  useTaskReportSources: (...args: unknown[]) => mockUseTaskReportSources(...args),
}));

function buildTemplateSource(index: number) {
  const templateId = `ttpl_000000000000000000${String(index).padStart(2, '0')}`;
  return {
    template_id: templateId,
    template_name: `Template ${index}`,
    task_type: 'ACTIVE',
    submitted_task_count: 120 + index,
    fields: [
      {
        key: `${templateId}:custom_${index}`,
        field_key: `custom_${index}`,
        label: `Template ${index} Custom`,
        type: 'text',
        source_template_id: templateId,
        source_template_name: `Template ${index}`,
        standard: false,
      },
    ],
  } as const;
}

function renderPicker(
  data: TaskReportSourcesResponse,
  selectedColumns: TaskReportSelectedColumn[] = [],
  options?: {
    scope?: TaskReportScope | null;
    sourcesData?: TaskReportSourcesResponse;
  },
) {
  const onChange = vi.fn();
  mockUseTaskReportSources.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  });

  render(
    <ReportColumnPicker
      studioId="std_00000000000000000001"
      scope={options?.scope ?? { date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
      selectedColumns={selectedColumns}
      onChange={onChange}
      sourcesData={options?.sourcesData}
    />,
  );

  return {
    onChange,
  };
}

describe('reportColumnPicker', () => {
  it('collapses template groups by default for large scope and can expand all templates', async () => {
    const user = userEvent.setup();
    const data: TaskReportSourcesResponse = {
      shared_fields: [],
      sources: Array.from({ length: 12 }, (_, idx) => buildTemplateSource(idx + 1)),
    };

    renderPicker(data);

    expect(screen.getByText(/Large scope detected/i)).toBeInTheDocument();
    const templateOneTrigger = screen.getAllByRole('button').find((button) => {
      return button.querySelector('.font-medium')?.textContent === 'Template 1';
    });
    if (!templateOneTrigger) {
      throw new Error('Template 1 trigger not found');
    }
    expect(templateOneTrigger).toHaveAttribute('data-state', 'closed');

    await user.click(screen.getByRole('button', { name: /Expand all templates/i }));
    expect(templateOneTrigger).toHaveAttribute('data-state', 'open');
  });

  it('supports selected-only and search filtering for noisy template lists', async () => {
    const user = userEvent.setup();
    const templateOne = buildTemplateSource(1);
    const templateTwo = buildTemplateSource(2);
    const data: TaskReportSourcesResponse = {
      shared_fields: [],
      sources: [
        {
          ...templateOne,
          fields: [
            templateOne.fields[0],
            {
              ...templateOne.fields[0],
              key: `${templateOne.template_id}:extra_1`,
              field_key: 'extra_1',
              label: 'Template 1 Extra',
            },
          ],
        },
        templateTwo,
      ],
    };

    renderPicker(data, [
      {
        key: `${templateOne.template_id}:custom_1`,
        label: 'Template 1 Custom',
        type: 'text',
      },
    ]);

    await user.click(screen.getByRole('button', { name: 'Selected only' }));
    expect(screen.getByLabelText('Template 1 Custom')).toBeInTheDocument();
    expect(screen.queryByLabelText('Template 1 Extra')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Template 2 Custom')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Selected only' }));
    await user.type(
      screen.getByPlaceholderText('Search by template, field label, key, or type'),
      'template 2',
    );
    expect(screen.getByLabelText('Template 2 Custom')).toBeInTheDocument();
    expect(screen.queryByLabelText('Template 1 Custom')).not.toBeInTheDocument();
  });

  it('filters shared fields by selected source templates when sources data is injected by parent', () => {
    const templateOne = buildTemplateSource(1);
    const data: TaskReportSourcesResponse = {
      shared_fields: [
        { key: 'gmv', label: 'GMV', type: 'number', category: 'metric', is_active: true },
      ],
      sources: [{
        ...templateOne,
        fields: [
          ...templateOne.fields,
          {
            key: 'gmv',
            field_key: 'gmv',
            label: 'GMV',
            type: 'number',
            standard: true,
            source_template_id: templateOne.template_id,
            source_template_name: templateOne.template_name,
          },
        ],
      }],
    };

    renderPicker(
      data,
      [],
      {
        scope: {
          date_from: '2026-03-01',
          date_to: '2026-03-07',
          source_templates: ['ttpl_00000000000000000099'],
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
        },
        sourcesData: data,
      },
    );

    expect(screen.queryByLabelText('GMV')).not.toBeInTheDocument();
  });

  it('renders shared fields as per-loop derived columns (gmv_l1..gmv_l8) under a single canonical entry', async () => {
    const user = userEvent.setup();
    const templateOne = buildTemplateSource(1);
    const data: TaskReportSourcesResponse = {
      shared_fields: [
        { key: 'gmv', label: 'GMV', type: 'number', category: 'metric', is_active: true },
      ],
      sources: [{
        ...templateOne,
        fields: [
          ...templateOne.fields,
          // Source field for loop 1's GMV column. After Phase 5 migration the
          // descriptor key is `gmv_l1`, the canonical shared key is `gmv`.
          {
            key: 'gmv_l1',
            field_key: 'gmv',
            label: 'GMV (Loop 1)',
            type: 'number',
            standard: true,
            group: 'l1',
            shared_field_key: 'gmv',
            source_template_id: templateOne.template_id,
            source_template_name: templateOne.template_name,
          },
          {
            key: 'gmv_l8',
            field_key: 'gmv',
            label: 'GMV (Loop 8)',
            type: 'number',
            standard: true,
            group: 'l8',
            shared_field_key: 'gmv',
            source_template_id: templateOne.template_id,
            source_template_name: templateOne.template_name,
          },
        ],
      }],
    };

    const { onChange } = renderPicker(data);

    // The canonical entry is rendered as a section header with derived columns.
    // The bare canonical name is NOT itself a checkbox — only specific loops are.
    expect(screen.queryByRole('checkbox', { name: 'GMV' })).not.toBeInTheDocument();

    // Per-loop derived columns are selectable, with a Loop N label.
    const loop1 = screen.getByRole('checkbox', { name: 'Loop 1' });
    const loop8 = screen.getByRole('checkbox', { name: 'Loop 8' });
    expect(loop1).toBeInTheDocument();
    expect(loop8).toBeInTheDocument();

    await user.click(loop8);
    expect(onChange).toHaveBeenCalledWith([
      { key: 'gmv_l8', label: 'GMV (Loop 8)', type: 'number' },
    ]);
  });
});
