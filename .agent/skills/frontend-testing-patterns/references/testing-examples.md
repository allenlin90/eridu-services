# Frontend Testing Patterns - Code Examples

This file contains detailed testing examples extracted from the main SKILL.md.

## Component Testing Examples

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskTemplateCard } from './task-template-card';

describe('TaskTemplateCard', () => {
  const mockTemplate = {
    uid: 'template_123',
    studioId: 'studio_456',
    name: 'Test Template',
    description: 'A test template',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: { name: 'John Doe' },
  };

  it('renders template name', () => {
    render(<TaskTemplateCard template={mockTemplate} />);
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('renders template description', () => {
    render(<TaskTemplateCard template={mockTemplate} />);
    expect(screen.getByText('A test template')).toBeInTheDocument();
  });

  it('renders created by name', () => {
    render(<TaskTemplateCard template={mockTemplate} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const templateWithoutDesc = { ...mockTemplate, description: undefined };
    render(<TaskTemplateCard template={templateWithoutDesc} />);
    expect(screen.queryByText('A test template')).not.toBeInTheDocument();
  });
});
```

### User Interaction Testing

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskTemplateToolbar } from './task-template-toolbar';

describe('TaskTemplateToolbar', () => {
  const mockTableState = {
    columnFilters: [],
    onColumnFiltersChange: vi.fn(),
  };

  it('calls onRefresh when refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskTemplateToolbar
        tableState={mockTableState}
        onRefresh={onRefresh}
        studioId="studio_123"
      />
    );

    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('navigates to create page when create button is clicked', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();

    // Mock useNavigate
    vi.mock('@tanstack/react-router', () => ({
      useNavigate: () => navigate,
    }));

    render(
      <TaskTemplateToolbar
        tableState={mockTableState}
        onRefresh={vi.fn()}
        studioId="studio_123"
      />
    );

    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(navigate).toHaveBeenCalledWith({
      to: '/studios/$studioId/task-templates/new',
      params: { studioId: 'studio_123' },
    });
  });

  it('updates search filter when typing in search input', async () => {
    const onColumnFiltersChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskTemplateToolbar
        tableState={{ ...mockTableState, onColumnFiltersChange }}
        onRefresh={vi.fn()}
        studioId="studio_123"
      />
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test query');

    // Wait for debounce (300ms)
    await vi.waitFor(() => {
      expect(onColumnFiltersChange).toHaveBeenCalled();
    }, { timeout: 500 });
  });
});
```

---

## Hook Testing Examples

### Basic Hook Test with TanStack Query

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTaskTemplates } from './use-task-templates';
import * as api from '../api/task-templates.api';

// Create wrapper for TanStack Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useTaskTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches task templates successfully', async () => {
    const mockTemplates = [
      { uid: '1', name: 'Template 1' },
      { uid: '2', name: 'Template 2' },
    ];

    vi.spyOn(api, 'getTaskTemplates').mockResolvedValue({
      data: mockTemplates,
      meta: { total: 2, nextCursor: undefined },
    });

    const { result } = renderHook(
      () => useTaskTemplates({ studioId: 'studio_123' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual(mockTemplates);
    expect(result.current.total).toBe(2);
  });

  it('handles error state', async () => {
    vi.spyOn(api, 'getTaskTemplates').mockRejectedValue(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(
      () => useTaskTemplates({ studioId: 'studio_123' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('refetches when refetch is called', async () => {
    const getTaskTemplatesSpy = vi.spyOn(api, 'getTaskTemplates').mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });

    const { result } = renderHook(
      () => useTaskTemplates({ studioId: 'studio_123' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getTaskTemplatesSpy).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(getTaskTemplatesSpy).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Testing Infinite Scroll Hook

```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInfiniteScroll } from './use-infinite-scroll';

describe('useInfiniteScroll', () => {
  let mockIntersectionObserver: any;

  beforeEach(() => {
    mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.prototype.observe = vi.fn();
    mockIntersectionObserver.prototype.disconnect = vi.fn();
    global.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates IntersectionObserver when sentinel is attached', () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      })
    );

    // Attach sentinel
    const sentinel = document.createElement('div');
    (result.current as any).current = sentinel;

    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('calls fetchNextPage when sentinel intersects', () => {
    const fetchNextPage = vi.fn();
    let observerCallback: any;

    mockIntersectionObserver.mockImplementation((callback: any) => {
      observerCallback = callback;
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    renderHook(() =>
      useInfiniteScroll({
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      })
    );

    // Simulate intersection
    observerCallback([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('does not fetch when already fetching next page', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScroll({
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: true, // Already fetching
      })
    );

    expect(mockIntersectionObserver.prototype.observe).not.toHaveBeenCalled();
  });
});
```

---

## API Mocking with MSW

### Setting up MSW

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Define handlers
export const handlers = [
  http.get('/api/studios/:studioId/task-templates', ({ params }) => {
    return HttpResponse.json({
      data: [
        {
          uid: 'template_1',
          studioId: params.studioId,
          name: 'Template 1',
          description: 'First template',
        },
        {
          uid: 'template_2',
          studioId: params.studioId,
          name: 'Template 2',
          description: 'Second template',
        },
      ],
      meta: {
        total: 2,
        nextCursor: undefined,
      },
    });
  }),

  http.post('/api/studios/:studioId/task-templates', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      uid: 'new_template',
      studioId: params.studioId,
      ...body,
    }, { status: 201 });
  }),

  http.put('/api/studios/:studioId/task-templates/:templateId', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      uid: params.templateId,
      studioId: params.studioId,
      ...body,
    });
  }),

  http.delete('/api/studios/:studioId/task-templates/:templateId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// Setup server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

### Using MSW in Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { TaskTemplatesPage } from './task-templates-page';

describe('TaskTemplatesPage', () => {
  it('displays task templates from API', async () => {
    render(<TaskTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    // Override handler for this test
    server.use(
      http.get('/api/studios/:studioId/task-templates', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<TaskTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('creates new template successfully', async () => {
    const user = userEvent.setup();
    render(<TaskTemplatesPage />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.type(screen.getByLabelText(/name/i), 'New Template');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('New Template')).toBeInTheDocument();
    });
  });
});
```

---

## Accessibility Testing

```typescript
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TaskTemplateCard } from './task-template-card';

expect.extend(toHaveNoViolations);

describe('TaskTemplateCard Accessibility', () => {
  it('has no accessibility violations', async () => {
    const mockTemplate = {
      uid: 'template_123',
      studioId: 'studio_456',
      name: 'Test Template',
      description: 'A test template',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    const { container } = render(<TaskTemplateCard template={mockTemplate} />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
```
