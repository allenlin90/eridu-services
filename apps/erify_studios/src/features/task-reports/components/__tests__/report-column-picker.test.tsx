import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TaskReportSelectedColumn, TaskReportSourcesResponse } from '@eridu/api-types/task-management';

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
      scope={{ date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
      selectedColumns={selectedColumns}
      onChange={onChange}
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
});
