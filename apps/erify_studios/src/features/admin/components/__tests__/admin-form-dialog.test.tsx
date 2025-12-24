import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AdminFormDialog } from '../admin-form-dialog';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Dialog: ({ open, children }: any) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, onClick, type, disabled }: any) => (
    <button onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  ),
  Form: ({ children }: any) => <>{children}</>,
  FormField: ({ render, name }: any) => render({ field: { name, value: '', onChange: vi.fn(), onBlur: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => <span>Error</span>,
  Input: ({ placeholder, onChange, value, name }: any) => (
    <input
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      name={name}
      data-testid={`input-${name}`}
    />
  ),
  Textarea: ({ placeholder, onChange, value, name }: any) => (
    <textarea
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      name={name}
      data-testid={`textarea-${name}`}
    />
  ),
}));

describe('adminFormDialog', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  });

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Dialog',
    description: 'Test Description',
    schema,
    onSubmit: vi.fn(),
    fields: [
      { name: 'name' as const, label: 'Name', placeholder: 'Enter name' },
      { name: 'email' as const, label: 'Email', placeholder: 'Enter email' },
    ],
  };

  it('renders dialog correctly', () => {
    render(<AdminFormDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with children as function', () => {
    render(
      <AdminFormDialog
        {...defaultProps}
        fields={undefined}
        children={(form) => (
          <div>
            <input
              {...form.register('name')}
              placeholder="Custom Name Input"
              data-testid="custom-input"
            />
          </div>
        )}
      />,
    );

    expect(screen.getByTestId('custom-input')).toBeInTheDocument();
  });

  it('renders with children as node', () => {
    render(
      <AdminFormDialog
        {...defaultProps}
        fields={undefined}
        children={<div data-testid="static-children">Static Content</div>}
      />,
    );

    expect(screen.getByTestId('static-children')).toBeInTheDocument();
  });

  it('handles submission', async () => {
    const onSubmit = vi.fn();
    render(<AdminFormDialog {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Since we mocked FormField and useForm is internal, we can't easily fill inputs in this unit test
      // without more complex mocking. Ideally, we test validation here.
      // But we can check that onSubmit was not called with invalid data (empty form)
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('handles cancel', () => {
    render(<AdminFormDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons when loading', () => {
    render(<AdminFormDialog {...defaultProps} isLoading />);

    const submitButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
