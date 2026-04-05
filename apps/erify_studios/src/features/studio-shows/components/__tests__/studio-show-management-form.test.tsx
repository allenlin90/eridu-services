import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { StudioShowDetail } from '@eridu/api-types/shows';

import { StudioShowManagementForm } from '../studio-show-management-form';

const fieldValues: Record<string, unknown> = {
  external_id: '',
  name: '',
  start_time: '',
  end_time: '',
  client_id: '',
  schedule_id: '',
  show_type_id: '',
  show_status_id: '',
  show_standard_id: '',
  studio_room_id: undefined,
  platform_ids: [],
};

vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg {...props} />,
}));

vi.mock('@/features/studio-shows/hooks/use-studio-show-form-lookup-options', () => ({
  useStudioShowClientOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowScheduleOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowRoomOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowTypeOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowStatusOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowStandardOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
  useStudioShowPlatformOptions: () => ({ options: [], isLoading: false, setSearch: vi.fn() }),
}));

vi.mock('@eridu/ui', () => ({
  AsyncCombobox: ({ placeholder }: any) => <div>{placeholder}</div>,
  AsyncMultiCombobox: ({ placeholder }: any) => <div>{placeholder}</div>,
  Button: ({ children, type, onClick, disabled }: any) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DateTimePicker: ({ value, onChange }: any) => (
    <button type="button" onClick={() => onChange(value)}>
      DateTimePicker
    </button>
  ),
  Form: ({ children }: any) => <>{children}</>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ name, render }: any) => render({
    field: {
      name,
      value: fieldValues[name] ?? '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
    },
  }),
  FormItem: ({ children, className }: any) => <div className={className}>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
  Input: ({ value = '', type = 'text', ...props }: any) => <input {...props} type={type} value={value} />,
}));

// Minimal valid orphan show: has all required fields but no schedule linkage.
// schedule_id: null represents a show that was never assigned to a schedule or
// was previously unlinked — the "orphan" state introduced in the Phase 4 show
// management feature.
const orphanShow: StudioShowDetail = {
  id: 'show_orphan1',
  name: 'Orphan Show',
  start_time: '2026-05-01T10:00:00.000Z',
  end_time: '2026-05-01T12:00:00.000Z',
  client_id: 'client_abc123',
  client_name: 'Test Client',
  schedule_id: null,
  schedule_name: null,
  studio_id: 'std_1',
  studio_name: 'Test Studio',
  studio_room_id: null,
  studio_room_name: null,
  show_type_id: 'sht_abc123',
  show_type_name: 'Live',
  show_status_id: 'shst_abc123',
  show_status_name: 'Active',
  show_status_system_key: null,
  show_standard_id: 'shsd_abc123',
  show_standard_name: 'Standard',
  metadata: {},
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  platforms: [],
};

describe('studioShowManagementForm', () => {
  it('renders create mode without throwing when composing the form schema', () => {
    render(
      <StudioShowManagementForm
        studioId="std_1"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('External ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getAllByText('DateTimePicker')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('submits an orphan show in edit mode with schedule_id as empty string', async () => {
    // Regression: edit-mode schema must accept schedule_id='' so that orphan shows
    // (shows with no schedule) can be opened and saved without being forced to pick a
    // schedule. The submit handler in the route converts '' → null for the API call.
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <StudioShowManagementForm
        studioId="std_1"
        show={orphanShow}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    // react-hook-form passes (data, event) to the submit handler
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ schedule_id: '' }),
        expect.anything(),
      );
    });
  });
});
