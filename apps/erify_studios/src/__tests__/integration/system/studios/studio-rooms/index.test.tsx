import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createStudioRoomInputSchema } from '@eridu/api-types/studio-rooms';

// Adjust import path to point to the actual route component
// From apps/erify_studios/src/__tests__/routes/system/studios/studio-rooms/index.test.tsx
// To apps/erify_studios/src/routes/system/studios/$studioId/studio-rooms/index.tsx
import { StudioRoomsList } from '../../../../../routes/system/studios/$studioId/studio-rooms/index';

// Mock UI components
vi.mock('@eridu/ui', async () => {
  const actual = await vi.importActual<any>('@eridu/ui');
  return {
    ...actual,
    useTableUrlState: vi.fn(() => ({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [],
      onColumnFiltersChange: vi.fn(),
    })),
    // Simplified components for testing
    Button: ({ children, onClick, disabled, type, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} type={type || 'button'} {...props}>
        {children}
      </button>
    ),
    Dialog: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    Form: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render }: any) => render({ field: { value: '', onChange: vi.fn() } }),
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <label>{children}</label>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormMessage: () => null,
    Input: ({ value, onChange, placeholder, type, ...props }: any) => (
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        {...props}
      />
    ),
    Textarea: ({ value, onChange, placeholder, ...props }: any) => (
      <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />
    ),
  };
});

// Mock Admin Components
vi.mock('@/features/admin/components', () => ({
  AdminLayout: ({ children, title, action }: any) => (
    <div>
      <h1>{title}</h1>
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
      {children}
    </div>
  ),
  AdminTable: ({ data, onEdit, onDelete }: any) => (
    <table>
      <tbody>
        {data.map((item: any) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.capacity}</td>
            <td>
              <button type="button" onClick={() => onEdit(item)}>Edit</button>
              <button type="button" onClick={() => onDelete(item)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  AdminFormDialog: ({ open, title, onSubmit, fields, isLoading }: any) =>
    open
      ? (
          <div role="dialog" aria-label={title}>
            <h2>{title}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData: any = {};
                // Simulate form data collection
                fields?.forEach((field: any) => {
                  // Mock value collection - in real test we'd need to simulate input
                  formData[field.name] = 'test-value';
                });
                onSubmit(formData);
              }}
            >
              {fields?.map((field: any) => (
                <div key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    type={field.type || 'text'}
                  />
                </div>
              ))}
              <button type="submit" disabled={isLoading}>
                Save
              </button>
            </form>
          </div>
        )
      : null,
  DeleteConfirmDialog: ({ open, onConfirm, title }: any) =>
    open
      ? (
          <div role="dialog" aria-label={title}>
            <h2>{title}</h2>
            <button type="button" onClick={onConfirm}>Confirm Delete</button>
          </div>
        )
      : null,
}));

// Mock Hooks
const mockMutateAsync = vi.fn();
vi.mock('@/features/studio-rooms/api/get-studio-rooms', () => ({
  useStudioRoomsQuery: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'room-1',
          name: 'Studio A',
          capacity: 100,
          created_at: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  })),
}));

vi.mock('@/features/studio-rooms/api/create-studio-room', () => ({
  useCreateStudioRoom: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/features/studio-rooms/api/update-studio-room', () => ({
  useUpdateStudioRoom: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/features/studio-rooms/api/delete-studio-room', () => ({
  useDeleteStudioRoom: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

// Mock Route Params
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: () => (options: any) => {
      // Mock useParams on the Route object
      return {
        ...options,
        useParams: () => ({ studioId: 'studio-123' }),
      };
    },
  };
});

describe('studioRoomsList Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it('renders list of rooms', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StudioRoomsList />
      </QueryClientProvider>,
    );

    // screen.debug(); // Debug output removed

    expect(screen.getByText('Studio Rooms')).toBeInTheDocument();
    expect(screen.getByText('Studio A')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('opens create dialog', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StudioRoomsList />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('Create Room'));
    expect(screen.getByRole('dialog', { name: 'Create Room' })).toBeInTheDocument();
  });

  it('opens edit dialog', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StudioRoomsList />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByRole('dialog', { name: 'Edit Room' })).toBeInTheDocument();
  });

  it('opens delete confirmation', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StudioRoomsList />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByRole('dialog', { name: 'Delete Room' })).toBeInTheDocument();
  });
});

describe('createStudioRoomInputSchema', () => {
  it('coerces string capacity to number', () => {
    const input = {
      name: 'Test Room',
      capacity: '100', // String input from form
      studio_id: 'studio-123',
    };
    const result = createStudioRoomInputSchema.parse(input);
    expect(result.capacity).toBe(100); // Number output
    expect(typeof result.capacity).toBe('number');
  });

  it('accepts number capacity', () => {
    const input = {
      name: 'Test Room',
      capacity: 100,
      studio_id: 'studio-123',
    };
    const result = createStudioRoomInputSchema.parse(input);
    expect(result.capacity).toBe(100);
  });

  it('validates positive capacity', () => {
    const input = {
      name: 'Test Room',
      capacity: -5,
      studio_id: 'studio-123',
    };
    expect(() => createStudioRoomInputSchema.parse(input)).toThrow();
  });

  it('validates required fields', () => {
    expect(() => createStudioRoomInputSchema.parse({})).toThrow();
  });
});
