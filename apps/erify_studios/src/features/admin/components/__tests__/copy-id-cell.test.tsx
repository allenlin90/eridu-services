import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyIdCell } from '../copy-id-cell';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="copy-icon">Copy</span>,
}));

describe('copyIdCell', () => {
  const mockClipboard = {
    writeText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('renders ID text', () => {
    render(<CopyIdCell id="test-id-123" />);

    // ID appears in both the span and tooltip
    const idElements = screen.getAllByText('test-id-123');
    expect(idElements.length).toBeGreaterThan(0);
  });

  it('renders tooltip with full ID', () => {
    render(<CopyIdCell id="very-long-id-that-might-be-truncated" />);

    expect(screen.getByTestId('tooltip-content')).toHaveTextContent('very-long-id-that-might-be-truncated');
  });

  it('renders copy button', () => {
    render(<CopyIdCell id="test-id" />);

    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
  });

  it('copies ID to clipboard when button is clicked', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    render(<CopyIdCell id="test-id-123" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test-id-123');
    });
  });

  it('shows success checkmark after copying', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    render(<CopyIdCell id="test-id" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('applies correct styling classes', () => {
    render(<CopyIdCell id="test-id" />);

    // Get the first occurrence (the span, not the tooltip)
    const idElements = screen.getAllByText('test-id');
    const idSpan = idElements[0];
    expect(idSpan).toHaveClass('font-mono', 'text-xs', 'text-muted-foreground', 'truncate');
  });

  it('handles long IDs with truncation', () => {
    const longId = 'a'.repeat(100);
    render(<CopyIdCell id={longId} />);

    // Get the first occurrence (the span, not the tooltip)
    const idElements = screen.getAllByText(longId);
    const idSpan = idElements[0];
    expect(idSpan).toHaveClass('truncate');
  });
});
