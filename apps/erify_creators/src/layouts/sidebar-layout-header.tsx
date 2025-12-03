import { SidebarTrigger } from '@eridu/ui/components/ui/sidebar';

export function SidebarLayoutHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Erify Creators</h1>
      </div>
    </header>
  );
}
