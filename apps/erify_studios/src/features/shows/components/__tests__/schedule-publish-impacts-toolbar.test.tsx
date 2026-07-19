import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SchedulePublishImpactsToolbar } from '../schedule-publish-impacts-toolbar';

vi.mock('@eridu/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@eridu/ui')>();
  return {
    ...actual,
    Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
    SheetTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    SheetContent: () => null,
  };
});

describe('schedulePublishImpactsToolbar', () => {
  it('consolidates filters and presents one range picker per date concept', async () => {
    const onToggleImpactKind = vi.fn();

    render(
      <SchedulePublishImpactsToolbar
        startFrom=""
        startTo=""
        onStartRangeChange={vi.fn()}
        changedFrom=""
        changedTo=""
        onChangedRangeChange={vi.fn()}
        selectedImpactKinds={[]}
        onToggleImpactKind={onToggleImpactKind}
        selectedResolutionStatuses={[]}
        onToggleResolutionStatus={vi.fn()}
        publishRunId={undefined}
        onClearPublishRun={vi.fn()}
        pageSize={25}
        onPageSizeChange={vi.fn()}
        onClearFilters={vi.fn()}
        isFetching={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show time' }))
      .toHaveTextContent('Pick a show time range');
    expect(screen.getByRole('button', { name: 'Change time' }))
      .toHaveTextContent('Pick a change time range');
    expect(screen.getByRole('group', { name: 'Impact kind' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Resolution status' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Impact kind/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resolution/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Updated' }));
    expect(onToggleImpactKind).toHaveBeenCalledWith('confirmed_future_updated');
  });
});
