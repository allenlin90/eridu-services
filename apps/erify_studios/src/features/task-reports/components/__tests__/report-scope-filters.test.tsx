import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TASK_STATUS } from '@eridu/api-types/task-management';

import { ReportScopeFilters } from '../report-scope-filters';

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (params: unknown) => mockUseQuery(params),
}));

vi.mock('@eridu/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@eridu/ui')>();
  return {
    ...actual,
    DatePickerWithRange: () => <div data-testid="date-range-picker" />,
  };
});

vi.mock('@/components/task-templates/shared/multi-select', () => ({
  MultiSelect: ({
    placeholder,
    options,
    onChange,
  }: {
    placeholder?: string;
    options: Array<{ value: string }>;
    onChange: (values: string[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(options.slice(0, 2).map((option) => option.value))}
    >
      {placeholder || 'multi-select'}
    </button>
  ),
}));

describe('reportScopeFilters', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'show-types') {
        return {
          data: {
            data: [
              { id: 'sht_1', name: 'BAU' },
              { id: 'sht_2', name: 'Campaign' },
            ],
          },
        };
      }

      if (queryKey[0] === 'show-standards') {
        return {
          data: {
            data: [
              { id: 'shsd_1', name: 'Standard' },
              { id: 'shsd_2', name: 'Premium' },
            ],
          },
        };
      }

      if (queryKey[0] === 'studio-clients') {
        return {
          data: {
            data: [
              { id: 'client_1', name: 'Nike' },
              { id: 'client_2', name: 'Adidas' },
            ],
          },
        };
      }

      return { data: undefined };
    });
  });

  it('emits multi-selected values for client/show-standard/show-type filters', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ReportScopeFilters
        studioId="std_1"
        scope={{ submitted_statuses: [TASK_STATUS.REVIEW, TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] }}
        sourceTemplateOptions={[]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Any client' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      client_id: ['client_1', 'client_2'],
    }));

    await user.click(screen.getByRole('button', { name: 'Any standard' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      show_standard_id: ['shsd_1', 'shsd_2'],
    }));

    await user.click(screen.getByRole('button', { name: 'Any type' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      show_type_id: ['sht_1', 'sht_2'],
    }));
  });

  it('resets all filters while restoring default submitted statuses', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ReportScopeFilters
        studioId="std_1"
        scope={{
          date_from: '2026-03-01',
          date_to: '2026-03-07',
          client_id: ['client_1'],
          show_standard_id: ['shsd_1'],
          show_type_id: ['sht_1'],
          source_templates: ['ttpl_1'],
          submitted_statuses: [TASK_STATUS.REVIEW],
        }}
        sourceTemplateOptions={[
          { label: 'Template 1', value: 'ttpl_1' },
          { label: 'Template 2', value: 'ttpl_2' },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /reset all filters/i }));
    expect(onChange).toHaveBeenCalledWith({
      submitted_statuses: [TASK_STATUS.REVIEW, TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED],
    });
  });
});
