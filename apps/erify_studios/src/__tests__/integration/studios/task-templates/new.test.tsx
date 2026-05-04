import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as idb from 'idb-keyval';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import from the correct relative path
import { TaskTemplateBuilderPage } from '@/routes/studios/$studioId/task-templates/new';

// --- Mocks ---

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router
const mockNavigate = vi.fn();
const mockParams = { studioId: 'test-studio-id' };

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    ...options,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  }),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  lazyRouteComponent: vi.fn(),
  Outlet: () => null,
}));

// Mock useCreateTaskTemplate hook
const mockCreateTemplate = vi.fn();
vi.mock('@/features/task-templates/hooks/use-create-task-template', () => ({
  useCreateTaskTemplate: ({ onSuccess, onError }: any) => {
    return {
      mutate: (data: any) => {
        mockCreateTemplate(data, onSuccess, onError);
      },
      isPending: false,
    };
  },
}));

// Mock useDebounceCallback
vi.mock('usehooks-ts', () => ({
  useDebounceCallback: (fn: any) => fn, // Immediate execution for tests
}));

// Mock TaskTemplateBuilder component
vi.mock('@/components/task-templates/builder/task-template-builder', () => ({
  TaskTemplateBuilder: ({ template, onChange, onSave, onCancel }: any) => (
    <div data-testid="builder-mock" data-schema-engine={template.schema_engine ?? 'task_template_v1'}>
      <input
        data-testid="name-input"
        value={template.name}
        onChange={(e) => onChange({ ...template, name: e.target.value })}
      />
      <button
        type="button"
        onClick={() => onChange({
          ...template,
          items: [{
            id: template.schema_engine === 'task_template_v2' ? 'fld_1234567890' : 'test-item-1',
            key: 'test_field',
            type: 'text',
            label: 'Test Field',
            required: false,
            options: [],
          }],
        })}
      >
        Add Valid Item
      </button>
      <button type="button" onClick={() => onSave(template)}>Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// --- Tests ---

describe('taskTemplateBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default idb behavior: no draft
    vi.mocked(idb.get).mockResolvedValue(undefined);
  });

  it('renders loading state initially', async () => {
    let resolveGet: (val: any) => void;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(idb.get).mockReturnValue(getPromise);

    render(<TaskTemplateBuilderPage />);

    expect(screen.getByText('Loading draft...')).toBeInTheDocument();

    // Finish loading
    resolveGet!(undefined);
    await waitFor(() => {
      expect(screen.queryByText('Loading draft...')).not.toBeInTheDocument();
    });
  });

  it('initializes with default values when no draft exists', async () => {
    vi.mocked(idb.get).mockResolvedValue(undefined);

    render(<TaskTemplateBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('builder-mock')).toBeInTheDocument();
    });

    expect(idb.get).toHaveBeenCalledWith('task_template_draft');
    // Check initial name is empty
    expect(screen.getByTestId('name-input')).toHaveValue('');
    expect(screen.getByTestId('builder-mock')).toHaveAttribute('data-schema-engine', 'task_template_v2');
  });

  it('initializes with draft values when draft exists', async () => {
    const draft = {
      name: 'Draft Template',
      description: 'Draft Description',
      items: [],
    };
    vi.mocked(idb.get).mockResolvedValue(draft);

    render(<TaskTemplateBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('builder-mock')).toBeInTheDocument();
    });

    expect(screen.getByTestId('name-input')).toHaveValue('Draft Template');
  });

  it('saves draft to IDB on change (debounced)', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    render(<TaskTemplateBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('builder-mock')).toBeInTheDocument();
    });

    // Simulate typing
    await user.type(screen.getByTestId('name-input'), 'New Name');

    // Check the final call
    expect(idb.set).toHaveBeenLastCalledWith('task_template_draft', expect.objectContaining({
      name: 'New Name',
    }));
  });

  it('handles successful template creation', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    // Setup successful mutation
    mockCreateTemplate.mockImplementation((data, onSuccess) => {
      onSuccess();
    });

    render(<TaskTemplateBuilderPage />);
    await waitFor(() => screen.getByTestId('builder-mock'));

    await user.type(screen.getByTestId('name-input'), 'Valid Name');
    await user.click(screen.getByText('Add Valid Item'));

    // Click save
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalled();
    });

    // onSuccess flow
    expect(idb.del).toHaveBeenCalledWith('task_template_draft');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Template created'), expect.anything());
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/studios/$studioId/task-templates',
      params: { studioId: 'test-studio-id' },
    });
  });

  it('handles validation error prevented save', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    render(<TaskTemplateBuilderPage />);
    await waitFor(() => screen.getByTestId('builder-mock'));

    // Leave name empty (invalid)
    await user.click(screen.getByText('Save'));

    // Should NOT call createTemplate
    expect(mockCreateTemplate).not.toHaveBeenCalled();

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('Validation failed', expect.anything());
  });

  it('handles creation error', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    // Setup failed mutation
    const error = new Error('API Failure');
    mockCreateTemplate.mockImplementation((data, onSuccess, onError) => {
      onError(error);
    });

    render(<TaskTemplateBuilderPage />);
    await waitFor(() => screen.getByTestId('builder-mock'));

    // Enter valid data
    await user.type(screen.getByTestId('name-input'), 'Valid Name');
    await user.click(screen.getByText('Add Valid Item'));

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalled();
    });

    expect(toast.error).toHaveBeenCalledWith('Error creating template', expect.objectContaining({
      description: 'API Failure',
    }));
  });

  it('sends the v2 schema envelope when creating a template', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    mockCreateTemplate.mockImplementation((data, onSuccess) => {
      onSuccess();
    });

    render(<TaskTemplateBuilderPage />);
    await waitFor(() => screen.getByTestId('builder-mock'));

    await user.type(screen.getByTestId('name-input'), 'Valid Name');
    await user.click(screen.getByText('Add Valid Item'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledWith(expect.objectContaining({
        schema: expect.objectContaining({
          schema_version: 2,
          schema_engine: 'task_template_v2',
          content_key_strategy: 'field_id',
          report_projection_strategy: 'descriptor',
        }),
      }), expect.any(Function), expect.any(Function));
    });
  });

  it('handles cancel properly', async () => {
    const user = userEvent.setup();
    vi.mocked(idb.get).mockResolvedValue(undefined);

    render(<TaskTemplateBuilderPage />);
    await waitFor(() => screen.getByTestId('builder-mock'));

    await user.click(screen.getByText('Cancel'));

    expect(idb.del).toHaveBeenCalledWith('task_template_draft');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/studios/$studioId/task-templates',
      params: { studioId: 'test-studio-id' },
    });
  });
});
