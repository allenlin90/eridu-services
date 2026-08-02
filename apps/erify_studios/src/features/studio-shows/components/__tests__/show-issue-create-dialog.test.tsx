import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowIssueCreateDialog } from '../show-issue-create-dialog';

const mockMutateAsync = vi.fn();
const mockUseCreateShowIssue = vi.fn();

vi.mock('@/features/studio-shows/api/create-show-issue', () => ({
  useCreateShowIssue: (...args: unknown[]) => mockUseCreateShowIssue(...args),
}));

vi.mock('../show-issue-owner-field', () => ({
  ShowIssueOwnerField: () => <div>Owner Field</div>,
}));

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
  ResponsiveDateTimePicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="due-date" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select aria-label="select" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
}));

describe('showIssueCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateShowIssue.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  });

  it('submits a manual issue with the entered title and default category/severity', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ShowIssueCreateDialog studioId="stu_1" showId="show_1" open onOpenChange={onOpenChange} />,
    );

    await user.type(screen.getByLabelText('Title'), 'Missing microphone');
    await user.click(screen.getByRole('button', { name: 'Create Issue' }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      show_id: 'show_1',
      category: 'OTHER',
      severity: 'MEDIUM',
      title: 'Missing microphone',
      evidence: undefined,
      owner_id: undefined,
      due_at: undefined,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables submission until a title is entered', () => {
    render(
      <ShowIssueCreateDialog studioId="stu_1" showId="show_1" open onOpenChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Create Issue' })).toBeDisabled();
  });
});
