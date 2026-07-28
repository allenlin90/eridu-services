import { Button } from '@eridu/ui';

type SceneQcTabsProps = {
  tab: 'daily' | 'records';
  onTabChange: (tab: 'daily' | 'records') => void;
};

/** §7.2 (2): Daily Review / Records. Records ships in Child PR 4 -- rendered disabled here (OQ-7). */
export function SceneQcTabs({ tab, onTabChange }: SceneQcTabsProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-1">
      <Button type="button" size="sm" variant={tab === 'daily' ? 'secondary' : 'ghost'} onClick={() => onTabChange('daily')}>
        Daily Review
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled title="Records is available in a future release">
        Records
        <span className="ml-1.5 text-[10px] uppercase text-muted-foreground">Soon</span>
      </Button>
    </div>
  );
}
