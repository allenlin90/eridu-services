import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ScheduleDeleteDialog,
  ScheduleUpdateDialog,
} from '../schedule-dialogs';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Input: ({ value, ...props }: any) => <input value={value} {...props} />,
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
    return (
      <div data-testid="admin-form-dialog">
        <h1>{title}</h1>
        <p>{description}</p>
        <div data-testid="fields">
          {fields?.map((field: any) => (
            <div key={field.name} data-testid={`field-${field.name}`}>
              {field.render
                ? field.render({
                    value: field.name.includes('date') ? '2024-01-01T10:00:00Z' : 'some-value',
                    onChange: vi.fn(),
                  })
                : null}
            </div>
          ))}
        </div>
      </div>
    );
  },
  DeleteConfirmDialog: ({ title, description, open }: any) => (
    open
      ? (
          <div data-testid="delete-confirm-dialog">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        )
      : null
  ),
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
  it('should render start_date formatted as local string', () => {
    render(<ScheduleUpdateDialog {...mockProps} />);

    const startDateInput = screen.getByTestId('field-start_date').querySelector('input');
    expect(startDateInput).toBeInTheDocument();

    // Check format matches local datetime string yyyy-MM-ddTHH:mm
    expect(startDateInput).toBeInTheDocument();
    expect(startDateInput?.getAttribute('value')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
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
