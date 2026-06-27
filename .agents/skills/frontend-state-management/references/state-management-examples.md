# Frontend State Management - Code Examples

This file contains detailed state management examples extracted from the main SKILL.md.

## Server State with TanStack Query

### Basic Query Example

```typescript
import { useQuery } from '@tanstack/react-query';
import { getTaskTemplates } from '../api/task-templates.api';

export function useTaskTemplates(studioId: string) {
  return useQuery({
    queryKey: ['task-templates', studioId],
    queryFn: () => getTaskTemplates(studioId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes (formerly cacheTime)
  });
}

// Usage in component
export function TaskTemplatesList({ studioId }: { studioId: string }) {
  const { data, isLoading, isError, error } = useTaskTemplates(studioId);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={error.message} />;

  return (
    <div>
      {data?.data.map((template) => (
        <TemplateCard key={template.uid} template={template} />
      ))}
    </div>
  );
}
```

### Mutation Example

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTaskTemplate } from '../api/task-templates.api';
import { toast } from 'sonner';

export function useCreateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskTemplateDto) => createTaskTemplate(studioId, data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['task-templates', studioId] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create template');
    },
  });
}

// Usage in component
export function CreateTemplateForm({ studioId }: { studioId: string }) {
  const mutation = useCreateTaskTemplate(studioId);

  const handleSubmit = (data: CreateTaskTemplateDto) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTaskTemplate } from '../api/task-templates.api';

export function useUpdateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTaskTemplateDto }) =>
      updateTaskTemplate(studioId, templateId, data),

    onMutate: async ({ templateId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['task-templates', studioId] });

      // Snapshot previous value
      const previousTemplates = queryClient.getQueryData(['task-templates', studioId]);

      // Optimistically update cache
      queryClient.setQueryData(['task-templates', studioId], (old: any) => ({
        ...old,
        data: old.data.map((t: any) =>
          t.uid === templateId ? { ...t, ...data } : t
        ),
      }));

      return { previousTemplates };
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        queryClient.setQueryData(['task-templates', studioId], context.previousTemplates);
      }
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['task-templates', studioId] });
    },
  });
}
```

### Infinite Query Example

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTaskTemplates } from '../api/task-templates.api';

export function useInfiniteTaskTemplates(studioId: string, searchQuery: string) {
  return useInfiniteQuery({
    queryKey: ['task-templates', studioId, searchQuery],
    queryFn: ({ pageParam }) =>
      getTaskTemplates(studioId, {
        limit: 20,
        name: searchQuery,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });
}

// Usage in component
export function InfiniteTaskList({ studioId }: { studioId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteTaskTemplates(studioId, '');

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      {items.map((template) => (
        <TemplateCard key={template.uid} template={template} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## URL State with TanStack Router

### Basic Search Params

```typescript
import { useNavigate, useSearch } from '@tanstack/react-router';

// Define search params schema
const searchSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute('/tasks')({
  validateSearch: searchSchema,
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/tasks' });

  const handleSearch = (query: string) => {
    navigate({
      search: (prev) => ({ ...prev, query, page: 1 }),
    });
  };

  const handleStatusChange = (status: 'active' | 'archived') => {
    navigate({
      search: (prev) => ({ ...prev, status, page: 1 }),
    });
  };

  return (
    <div>
      <input
        value={search.query || ''}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <select
        value={search.status || 'active'}
        onChange={(e) => handleStatusChange(e.target.value as any)}
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}
```

### useTableUrlState Hook

```typescript
import { useTableUrlState } from '@eridu/ui';

export function TasksPage() {
  const tableState = useTableUrlState({
    from: '/tasks',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'createdAt', desc: true }],
  });

  const { columnFilters, sorting, onColumnFiltersChange, onSortingChange } = tableState;

  // URL automatically syncs with state
  return (
    <DataTable
      data={tasks}
      columns={columns}
      columnFilters={columnFilters}
      sorting={sorting}
      onColumnFiltersChange={onColumnFiltersChange}
      onSortingChange={onSortingChange}
    />
  );
}
```

### Debounced Search with URL Sync

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useDebounce } from '@eridu/ui';

export function SearchBar() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/tasks' });

  // Local state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(search.query || '');
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local state with URL state
  useEffect(() => {
    setLocalSearch(search.query || '');
  }, [search.query]);

  // Update URL when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== search.query) {
      navigate({
        search: (prev) => ({ ...prev, query: debouncedSearch || undefined }),
      });
    }
  }, [debouncedSearch, search.query, navigate]);

  return (
    <input
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

## Local Component State with useState

### Form State

```typescript
import { useState } from 'react';

export function CreateTaskForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button type="submit">Create</button>
    </form>
  );
}
```

### UI State (Modals, Dropdowns)

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@eridu/ui';

export function TaskActions() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger>Delete</DialogTrigger>
        <DialogContent>
          <p>Are you sure?</p>
          <button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## Global Client State with Zustand

### Auth Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  uid: string;
  email: string;
  name: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Usage in component
export function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) return <LoginButton />;

  return (
    <div>
      <p>{user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Theme Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Usage in component
export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Sidebar State

```typescript
import { create } from 'zustand';

type SidebarState = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

// Usage in component
export function Sidebar() {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <aside className={isOpen ? 'w-64' : 'w-0'}>
      <button onClick={toggle}>Toggle</button>
    </aside>
  );
}
```

---

## Complex State with useReducer

```typescript
import { useReducer } from 'react';

type Task = {
  id: string;
  name: string;
  completed: boolean;
};

type State = {
  tasks: Task[];
  filter: 'all' | 'active' | 'completed';
};

type Action =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: 'all' | 'active' | 'completed' };

function taskReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload ? { ...task, completed: !task.completed } : task
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}

export function TaskManager() {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: [],
    filter: 'all',
  });

  const filteredTasks = state.tasks.filter((task) => {
    if (state.filter === 'active') return !task.completed;
    if (state.filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div>
      <button onClick={() => dispatch({ type: 'SET_FILTER', payload: 'all' })}>All</button>
      <button onClick={() => dispatch({ type: 'SET_FILTER', payload: 'active' })}>Active</button>
      <button onClick={() => dispatch({ type: 'SET_FILTER', payload: 'completed' })}>Completed</button>

      {filteredTasks.map((task) => (
        <div key={task.id}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
          />
          <span>{task.name}</span>
          <button onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```
