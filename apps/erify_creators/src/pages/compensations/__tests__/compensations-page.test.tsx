import { useNavigate, useSearch } from '@tanstack/react-router';
import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompensationsPage } from '../compensations-page';

import { useMyShowCompensations } from '@/features/compensations/api/compensations.api';
import { useActiveStudio } from '@/lib/hooks';
import { renderWithQueryClient } from '@/test/test-utils';

// Mock hook dependencies
vi.mock('@/features/compensations/api/compensations.api', () => ({
  useMyShowCompensations: vi.fn(),
}));

vi.mock('@/lib/hooks', () => ({
  useActiveStudio: vi.fn(),
}));

// Mock localized paraglide messages
vi.mock('@/paraglide/messages.js', () => ({
  'compensations.title': () => 'My Compensations',
  'compensations.totalEarnings': () => 'Total Earnings',
  'compensations.showsCompleted': () => 'Shows Completed',
  'compensations.pendingItems': () => 'Pending Items',
  'compensations.errorLoading': () => 'Failed to load compensations data. Please try again.',
  'compensations.tryAgain': () => 'Try Again',
  'compensations.noData': () => 'No compensations found for the selected period.',
  'compensations.showName': () => 'Show Name',
  'compensations.dateTime': () => 'Date & Time',
  'compensations.type': () => 'Type',
  'compensations.rate': () => 'Agreed Rate',
  'compensations.commission': () => 'Commission',
  'compensations.baseAmount': () => 'Base Amount',
  'compensations.adjustments': () => 'Adjustments',
  'compensations.total': () => 'Total Amount',
  'compensations.unresolved': () => 'Unresolved',
  'compensations.resolved': () => 'Resolved',
}));

describe('compensationsPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useSearch).mockReturnValue({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z',
    });

    vi.mocked(useActiveStudio).mockReturnValue({
      activeStudioId: 'std_1',
      activeStudio: { studio: { uid: 'std_1', name: 'Premium Studio' } },
      studios: [],
      switchStudio: vi.fn(),
    } as any);

    // Default useMyShowCompensations loading state
    vi.mocked(useMyShowCompensations).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders loading state correctly', () => {
    renderWithQueryClient(<CompensationsPage />);

    expect(screen.getByText('My Compensations')).toBeInTheDocument();
    expect(screen.getByText('Loading compensations data...')).toBeInTheDocument();
  });

  it('renders error state correctly with a retry button', () => {
    vi.mocked(useMyShowCompensations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<CompensationsPage />);

    expect(screen.getByText('Failed to load compensations data. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders empty data state correctly', () => {
    vi.mocked(useMyShowCompensations).mockReturnValue({
      data: { shows: [], total_amount: '0.00', unresolved_count: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<CompensationsPage />);

    expect(screen.getByText('No compensations found for the selected period.')).toBeInTheDocument();
  });

  it('renders populated data with summary metrics and table breakdown', () => {
    vi.mocked(useMyShowCompensations).mockReturnValue({
      data: {
        total_amount: '1250.00',
        unresolved_count: 1,
        shows: [
          {
            show_creator_id: 'sc_1',
            show_name: 'Show Gold Run',
            show_start_time: '2026-05-15T12:00:00.000Z',
            compensation_type: 'FIXED',
            agreed_rate: '500.00',
            commission_rate: null,
            base_amount: '500.00',
            adjustment_total: '0.00',
            total_amount: '500.00',
            unresolved_reason: null,
          },
          {
            show_creator_id: 'sc_2',
            show_name: 'Show Silver Sprint',
            show_start_time: '2026-05-20T14:00:00.000Z',
            compensation_type: 'COMMISSION',
            agreed_rate: null,
            commission_rate: '10',
            base_amount: '0.00',
            adjustment_total: '50.00',
            total_amount: '750.00',
            unresolved_reason: 'COMMISSION_REVENUE_NOT_AVAILABLE',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<CompensationsPage />);

    // Check header and studio description
    expect(screen.getByText('My Compensations')).toBeInTheDocument();
    expect(screen.getByText('Viewing show earnings with Premium Studio')).toBeInTheDocument();

    // Check summary card metric values
    expect(screen.getByText('$1250.00')).toBeInTheDocument(); // Total Earnings
    expect(screen.getByText('2')).toBeInTheDocument(); // Shows Completed
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending Items

    // Check table headers
    expect(screen.getByText('Show Name')).toBeInTheDocument();
    expect(screen.getByText('Date & Time')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();

    // Check first show name and items
    expect(screen.getByText('Show Gold Run')).toBeInTheDocument();
    expect(screen.getAllByText('$500.00')[0]).toBeInTheDocument(); // Fixed show amount
    expect(screen.getAllByText('Resolved')[0]).toBeInTheDocument();

    // Check second show name, unresolved reason, commission layout, and adjustments
    expect(screen.getByText('Show Silver Sprint')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('+$50.00')).toBeInTheDocument();
    expect(screen.getAllByText('Unresolved')[0]).toBeInTheDocument();
    expect(screen.getByText('Revenue pending verification')).toBeInTheDocument();
  });
});
