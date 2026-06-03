import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

export type ShowRunTab = 'creators' | 'violations' | 'tasks' | 'shows';

type TabNavItem = {
  tab: ShowRunTab;
  label: string;
  count: number;
  /** Badge classes applied when the tab is active; empty keeps the muted badge. */
  activeBadgeClassName: string;
};

type ShowRunTabNavProps = {
  activeTab: ShowRunTab;
  onTabChange: (tab: ShowRunTab) => void;
  data: ShowRunReviewSummary;
};

/**
 * Horizontal tab bar for the Show Run Review exception logs. Counts and
 * active-state styling are driven by a single config array so each tab stays
 * consistent.
 */
export function ShowRunTabNav({ activeTab, onTabChange, data }: ShowRunTabNavProps) {
  const items: TabNavItem[] = [
    {
      tab: 'creators',
      label: 'Creators',
      count: data.creators.late_count + data.creators.missing_count,
      activeBadgeClassName: 'bg-amber-100 text-amber-800',
    },
    {
      tab: 'violations',
      label: 'Stream Alerts',
      count: data.platforms.active_violations_count,
      activeBadgeClassName: 'bg-rose-100 text-rose-800',
    },
    {
      tab: 'tasks',
      label: 'Incomplete Tasks',
      count: data.tasks.incomplete_phase_checks_count,
      activeBadgeClassName: 'bg-purple-100 text-purple-800',
    },
    {
      tab: 'shows',
      label: 'Shows Range',
      count: data.shows.total_count,
      activeBadgeClassName: '',
    },
  ];

  return (
    <div className="flex w-full sm:w-auto min-w-0 overflow-x-auto scrollbar-none flex-nowrap items-center gap-1 rounded-lg bg-muted p-1 text-xs scroll-smooth">
      {items.map((item) => {
        const isActive = activeTab === item.tab;
        const badgeClassName = isActive && item.activeBadgeClassName
          ? item.activeBadgeClassName
          : 'bg-muted-foreground/20';
        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => onTabChange(item.tab)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all flex-shrink-0 ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{item.label}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${badgeClassName}`}>
              {item.count}
            </span>
          </button>
        );
      })}
      <div className="w-4 flex-shrink-0" />
    </div>
  );
}
