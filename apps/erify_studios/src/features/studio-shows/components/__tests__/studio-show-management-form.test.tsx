import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
