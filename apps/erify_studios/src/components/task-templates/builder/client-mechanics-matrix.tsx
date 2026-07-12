import { AlertCircle, RefreshCw } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';

import type { FieldItem, LoopMetadata } from './schema';

import type { ClientMechanic } from '@/features/client-mechanics/api/get-client-mechanics';

type ClientMechanicsMatrixProps = {
  clientId: string | null | undefined;
  templateItems: FieldItem[];
  clientMechanics: ClientMechanic[];
  activeMechanics: ClientMechanic[];
  visibleMechanics: ClientMechanic[];
  loops: LoopMetadata[];
  isLoading: boolean;
  isMobile: boolean;
  hasRetiredRefs: boolean;
  hasSupersededRefs: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onUpgradeAll: () => void;
  onToggle: (mechanic: ClientMechanic, loopId: string, checked: boolean) => void;
  onUpgrade: (mechanic: ClientMechanic, loopId: string) => void;
};

/** Renders the desktop Loop x Mechanic assignment matrix and fallback guidance. */
export function ClientMechanicsMatrix({
  clientId,
  templateItems,
  clientMechanics,
  activeMechanics,
  visibleMechanics,
  loops,
  isLoading,
  isMobile,
  hasRetiredRefs,
  hasSupersededRefs,
  search,
  onSearchChange,
  onUpgradeAll,
  onToggle,
  onUpgrade,
}: ClientMechanicsMatrixProps) {
  if (!clientId)
    return null;
  if (!isLoading && activeMechanics.length === 0) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        {clientMechanics.length === 0
          ? 'This client has no mechanics in the catalog yet. Create at least one active mechanic under Client Mechanics for this client to assign it here.'
          : 'This client\'s mechanics are all retired. Reactivate or create one under Client Mechanics for this client to assign it here.'}
      </p>
    );
  }
  if (activeMechanics.length === 0)
    return null;
  // The grid is wide and not usable on small viewports, so mobile always falls back
  // to Cards (mechanic fields still render there, read-only, via field-editor's
  // isMechanicField gate).
  if (isMobile) {
    return (
      <p className="text-xs text-muted-foreground bg-muted/50 border rounded px-3 py-2">
        Assigning mechanics to loops requires a larger screen. Switch to a tablet or desktop to use the Client Mechanics Matrix.
      </p>
    );
  }

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-white to-zinc-50/50">
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight">Client Mechanics Matrix</CardTitle>
          <CardDescription className="text-xs">
            Assign client mechanics to loops. Checked mechanics will be added as checkbox inputs.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasRetiredRefs
            ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Some assigned mechanics are retired. Check cards below.
                </div>
              )
            : null}
          {hasSupersededRefs
            ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 flex items-center gap-1 shrink-0 h-8"
                  onClick={onUpgradeAll}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {' '}
                  Upgrade All References
                </Button>
              )
            : null}
        </div>
      </CardHeader>
      <div className="px-4 pb-3 border-t pt-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${activeMechanics.length} mechanic${activeMechanics.length === 1 ? '' : 's'} by title or label...`}
          className="h-8 max-w-sm text-sm"
        />
      </div>
      {/* Mechanics (rows, can run into the dozens once a client's catalog grows) and
          loops (columns, a handful per template) are deliberately NOT transposed the
          "obvious" way: a wide grid with one column per mechanic overlaps and becomes
          illegible past a handful of mechanics. Rows scroll naturally and stay
          searchable; columns don't. */}
      <CardContent className="p-0 border-t">
        {visibleMechanics.length === 0
          ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No mechanics match "
                {search}
                ".
              </p>
            )
          : (
              <div className="overflow-auto max-w-full max-h-112">
                <Table className="min-w-full divide-y divide-border">
                  <TableHeader className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-56 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-4">
                        Mechanic
                      </TableHead>
                      {loops.map((loop) => (
                        <TableHead key={loop.id} className="min-w-24 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-2 truncate">
                          {loop.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-border">
                    {visibleMechanics.map((mechanic) => (
                      <TableRow key={mechanic.id} className="hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-sm text-zinc-900 py-3 px-4 max-w-56">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate cursor-help underline decoration-dotted underline-offset-4">
                                  {mechanic.title}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs p-2.5">
                                <p className="font-semibold text-xs mb-1">{mechanic.instruction_label}</p>
                                <p className="text-[11px] text-muted-foreground leading-normal">{mechanic.instruction_body}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        {loops.map((loop) => {
                          const assigned = templateItems.find(
                            (item) => item.group === loop.id && item.mechanic_ref?.mechanic_id === mechanic.id,
                          );
                          const isSuperseded = assigned
                            ? mechanic.content_revision > (assigned.mechanic_ref?.content_revision ?? 0)
                            : false;
                          return (
                            <TableCell key={loop.id} className="text-center py-3 px-2">
                              <div className="flex items-center justify-center gap-1.5">
                                <Checkbox
                                  checked={Boolean(assigned)}
                                  aria-label={`Toggle ${mechanic.title} for ${loop.name}`}
                                  onCheckedChange={(checked) => onToggle(mechanic, loop.id, Boolean(checked))}
                                />
                                {isSuperseded
                                  ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                              onClick={() => onUpgrade(mechanic, loop.id)}
                                            >
                                              <RefreshCw className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent className="p-2 text-xs">
                                            Catalog update available. Click to upgrade.
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  : null}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
