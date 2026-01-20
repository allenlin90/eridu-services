import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateCell, ItemsList, PlatformList, ShowStatusBadge, ShowTypeBadge } from '../show-table-cells';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Briefcase: () => <span data-testid="briefcase-icon">💼</span>,
  Megaphone: () => <span data-testid="megaphone-icon">📢</span>,
}));

// Mock PlatformIcon
vi.mock('../platform-icons', () => ({
  PlatformIcon: ({ platform }: any) => <span data-testid="platform-icon">{platform}</span>,
}));

// Mock CopyIdCell
vi.mock('../copy-id-cell', () => ({
  CopyIdCell: ({ id }: any) => <span data-testid="copy-id-cell">{id}</span>,
}));

describe('itemsList', () => {
  it('displays all items when count is less than or equal to limit', () => {
    render(<ItemsList items={['Item 1', 'Item 2']} limit={3} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows +N badge for overflow items', () => {
    render(<ItemsList items={['Item 1', 'Item 2', 'Item 3', 'Item 4']} limit={2} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('popover shows remaining items', () => {
    render(<ItemsList items={['Item 1', 'Item 2', 'Item 3']} limit={1} label="Test Items" />);

    expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    expect(screen.getByText('Test Items')).toBeInTheDocument();
  });

  it('shows "-" for empty array', () => {
    render(<ItemsList items={[]} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows "-" for null items', () => {
    render(<ItemsList items={null as any} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('uses custom renderItem function', () => {
    const renderItem = (item: string) => <strong>{item.toUpperCase()}</strong>;
    render(<ItemsList items={['test']} renderItem={renderItem} />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('uses default limit of 2', () => {
    render(<ItemsList items={['A', 'B', 'C']} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

describe('dateCell', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15T10:30:00');
    render(<DateCell date={date} />);

    // Check for formatted date (format may vary by locale)
    expect(screen.getByText(/Jan/i)).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    const date = new Date('2024-01-15T10:30:00');
    render(<DateCell date={date} />);

    // Check for time (format may vary by locale)
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it('handles string date input', () => {
    render(<DateCell date="2024-01-15T10:30:00" />);

    expect(screen.getByText(/Jan/i)).toBeInTheDocument();
  });

  it('shows "-" for empty date', () => {
    render(<DateCell date={null as any} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows "-" for undefined date', () => {
    render(<DateCell date={undefined as any} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('showStatusBadge', () => {
  it('renders "live" status with red styling', () => {
    render(<ShowStatusBadge status="live" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('live');
    expect(badge).toHaveClass('bg-red-100', 'text-red-700', 'border-red-200');
  });

  it('renders "draft" status with secondary variant', () => {
    render(<ShowStatusBadge status="draft" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('draft');
    expect(badge).toHaveAttribute('data-variant', 'secondary');
  });

  it('renders "confirmed" status with default variant', () => {
    render(<ShowStatusBadge status="confirmed" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('confirmed');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('renders "completed" status with outline variant', () => {
    render(<ShowStatusBadge status="completed" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('completed');
    expect(badge).toHaveAttribute('data-variant', 'outline');
  });

  it('renders unknown status with outline variant', () => {
    render(<ShowStatusBadge status="unknown-status" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('unknown-status');
    expect(badge).toHaveAttribute('data-variant', 'outline');
  });

  it('capitalizes status text', () => {
    render(<ShowStatusBadge status="draft" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('capitalize');
  });

  it('handles case-insensitive status matching', () => {
    render(<ShowStatusBadge status="LIVE" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-red-100');
  });
});

describe('showTypeBadge', () => {
  it('renders "campaign" with megaphone icon and purple styling', () => {
    render(<ShowTypeBadge type="campaign" />);

    expect(screen.getByTestId('megaphone-icon')).toBeInTheDocument();
    expect(screen.getByText('Campaign')).toBeInTheDocument();

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-700');
  });

  it('renders "bau" with briefcase icon', () => {
    render(<ShowTypeBadge type="bau" />);

    expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
    expect(screen.getByText('bau')).toBeInTheDocument();
  });

  it('defaults to "BAU" when type is undefined', () => {
    render(<ShowTypeBadge type={undefined} />);

    expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
    expect(screen.getByText('BAU')).toBeInTheDocument();
  });

  it('handles case-insensitive type matching', () => {
    render(<ShowTypeBadge type="CAMPAIGN" />);

    expect(screen.getByTestId('megaphone-icon')).toBeInTheDocument();
  });

  it('renders other types with briefcase icon', () => {
    render(<ShowTypeBadge type="other-type" />);

    expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
    expect(screen.getByText('other-type')).toBeInTheDocument();
  });
});

describe('platformList', () => {
  it('renders platform icons with names', () => {
    render(<PlatformList items={['TikTok', 'Shopee']} />);

    // Platform names appear twice: once in the mock icon and once in the text
    const tiktokElements = screen.getAllByText('TikTok');
    const shopeeElements = screen.getAllByText('Shopee');

    expect(tiktokElements.length).toBeGreaterThan(0);
    expect(shopeeElements.length).toBeGreaterThan(0);

    const icons = screen.getAllByTestId('platform-icon');
    expect(icons).toHaveLength(2);
  });

  it('integrates with ItemsList for overflow', () => {
    render(<PlatformList items={['TikTok', 'Shopee', 'Lazada']} />);

    // Default limit is 2, so should show +1
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('shows "-" for empty platforms', () => {
    render(<PlatformList items={[]} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('uses "Platforms" as label', () => {
    render(<PlatformList items={['TikTok', 'Shopee', 'Lazada']} />);

    expect(screen.getByText('Platforms')).toBeInTheDocument();
  });
});
