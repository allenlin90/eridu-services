import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShiftDetailHeader } from '../shift-detail-header';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href="/shifts" {...props}>{children}</a>
  ),
}));

const shift = {
  id: 'ssh_1',
  studio_id: 'std_1',
  user_id: 'user_1',
  user_name: 'Ava Manager',
  date: '2026-03-05',
  hourly_rate: '20.00',
  planned_cost: '60.00',
  actual_cost: null,
  is_approved: false,
  is_duty_manager: true,
  status: 'SCHEDULED' as const,
  metadata: {},
  blocks: [
    {
      id: 'ssb_1',
      start_time: '2026-03-05T09:00:00.000Z',
      end_time: '2026-03-05T12:00:00.000Z',
      actual_start_time: null,
      actual_end_time: null,
      metadata: {},
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
    },
  ],
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

describe('shiftDetailHeader', () => {
  it('renders loading state without shift data', () => {
    render(<ShiftDetailHeader studioId="std_1" shift={undefined} isLoading />);

    expect(screen.getByRole('heading', { name: 'Loading shift...' })).toBeInTheDocument();
    expect(screen.getByLabelText('Back to shifts')).toBeInTheDocument();
  });

  it('renders shift identity and metadata badges', () => {
    render(<ShiftDetailHeader studioId="std_1" shift={shift} isLoading={false} />);

    expect(screen.getByRole('heading', { name: 'Ava Manager' })).toBeInTheDocument();
    expect(screen.getByText('Mar 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('Duty Manager')).toBeInTheDocument();
    expect(screen.getByText('$20.00 / hr')).toBeInTheDocument();
    expect(screen.getByText('$60.00 planned')).toBeInTheDocument();
  });
});
