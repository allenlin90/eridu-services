import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeleteConfirmDialog } from '../delete-confirm-dialog';

// Mock UI components - AlertDialogCancel should not call onOpenChange directly
// The real component handles this through the AlertDialog wrapper
vi.mock('@eridu/ui', () => ({
  AlertDialog: ({ open, children, onOpenChange }: any) => {
    // Simulate the AlertDialog behavior: wrap children and handle cancel
    if (!open)
      return null;

    return (
      <div role="alertdialog" data-on-open-change={onOpenChange}>
        {children}
      </div>
    );
  },
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, disabled, ...props }: any) => (
    <button type="button" {...props} disabled={disabled} data-testid="cancel-button">
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" {...props} onClick={onClick} disabled={disabled} data-testid="confirm-button">
      {children}
    </button>
  ),
}));

describe('deleteConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('renders dialog when open is true', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(<DeleteConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders default title and description', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone. This will permanently delete this item.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <DeleteConfirmDialog
        {...defaultProps}
        title="Delete User?"
        description="This will permanently delete the user account."
      />,
    );

    expect(screen.getByText('Delete User?')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete the user account.')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('confirm-button'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows "Deleting..." text when loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} isLoading />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('shows "Delete" text when not loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} isLoading />);

    expect(screen.getByTestId('cancel-button')).toBeDisabled();
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('enables buttons when not loading', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
    expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
  });

  it('prevents default on confirm button click', () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByTestId('confirm-button');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    confirmButton.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });
});
