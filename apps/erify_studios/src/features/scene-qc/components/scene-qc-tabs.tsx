import { Button } from '@eridu/ui';

type SceneQcTabsProps = {
  tab: 'daily' | 'records' | 'reports';
  onTabChange: (tab: 'daily' | 'records' | 'reports') => void;
};

/** §7.2 (2): Daily Review / Records. Records enabled in Child PR 4 (discharges Child PR 3 OQ-7). */
export function SceneQcTabs({ tab, onTabChange }: SceneQcTabsProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-1">
      <Button type="button" size="sm" variant={tab === 'daily' ? 'secondary' : 'ghost'} onClick={() => onTabChange('daily')}>
        Daily Review
      </Button>
      <Button type="button" size="sm" variant={tab === 'records' ? 'secondary' : 'ghost'} onClick={() => onTabChange('records')}>
        Records
      </Button>
      <Button type="button" size="sm" variant={tab === 'reports' ? 'secondary' : 'ghost'} onClick={() => onTabChange('reports')}>
        Reports
      </Button>
    </div>
  );
}
