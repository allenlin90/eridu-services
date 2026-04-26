import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ScheduleDeleteDialog,
  ScheduleUpdateDialog,
} from '../schedule-dialogs';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Input: ({ value, ...props }: any) => <input value={value} {...props} />,
  DateTimePicker: ({ value, onChange, ...props }: any) => (
    <input
      data-testid="datetime-picker"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    />
  ),
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/features/admin/components', () => ({
  AdminFormDialog: ({ title, description, open, fields }: any) => {
    if (!open)
      return null;

    const getFieldId = (field: any) => field.name ?? field.id;

    const getMockFieldValue = (field: any) => {
      if (field.name?.includes('date')) {
        return '2024-01-01T10:00:00Z';
      }

      return 'some-value';
    };

    const renderField = (field: any) => {
      const fieldId = getFieldId(field);
      let content = null;

      if (field.render) {
        content = field.render({
          value: getMockFieldValue(field),
          onChange: vi.fn(),
        });
      }

      return (
        <div key={fieldId} data-testid={`field-${fieldId}`}>
          {content}
        </div>
      );
    };

    return (
      <div data-testid="admin-form-dialog">
        <h1>{title}</h1>
        <p>{description}</p>
        <div data-testid="fields">
          {fields?.map(renderField)}
        </div>
      </div>
    );
  },
  DeleteConfirmDialog: ({ title, description, open }: any) => {
    if (!open) {
      return null;
    }

    return (
      <div data-testid="delete-confirm-dialog">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    );
  },
}));

describe('scheduleUpdateDialog', () => {
  const mockProps = {
    schedule: {
      id: 'schedule-1',
      name: 'Test Schedule',
      client_name: 'Test Client',
      status: 'draft' as const,
      version: 1,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-12-31T23:59:59Z',
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      published_at: null,
      client_id: 'client-1',
      created_by: 'user-1',
      created_by_name: 'Test User',
      published_by: null,
      published_by_name: null,
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when schedule is provided', () => {
    render(<ScheduleUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Schedule')).toBeInTheDocument();
  });

  it('should not render when schedule is null', () => {
    render(<ScheduleUpdateDialog {...mockProps} schedule={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
  it('should pass the current start_date value to the shared datetime picker', () => {
    render(<ScheduleUpdateDialog {...mockProps} />);

    const startDateInput = screen.getByTestId('field-start_date').querySelector('input');
    expect(startDateInput).toBeInTheDocument();
    expect(startDateInput).toHaveValue('2024-01-01T10:00:00Z');
  });
});

describe('scheduleDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<ScheduleDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Schedule')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ScheduleDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
