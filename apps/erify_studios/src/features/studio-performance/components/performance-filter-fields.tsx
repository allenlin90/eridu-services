import { ChevronDown } from 'lucide-react';

import {
  AsyncCombobox,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Label,
} from '@eridu/ui';

import { type PerformanceSearch, toArrayParam } from './performance-shows-filters.utils';

type FilterFieldsProps = {
  setClientSearch: (val: string) => void;
  clientOptions: Array<{ value: string; label: string }>;
  isLoadingClients: boolean;
  search: PerformanceSearch;
  handleFilterChange: (key: 'client_id' | 'has_performance', value: string) => void;
  selectedShowTypes: Array<{ id: string; name: string }>;
  showTypeOptions: Array<{ value: string; label: string }>;
  handleMultiFilterChange: (key: 'show_type_id' | 'platform_id' | 'show_standard_id', value: string[]) => void;
  selectedPlatforms: Array<{ id: string; name: string }>;
  platformOptions: Array<{ value: string; label: string }>;
  selectedShowStandards: Array<{ id: string; name: string }>;
  showStandardOptions: Array<{ value: string; label: string }>;
};

/**
 * Filter body for the performance shows table — rendered inside both the mobile
 * sheet and the desktop popover. Stateless: all selection state and change
 * handlers are owned by `PerformanceShowsTable` and passed in.
 */
export function FilterFields({
  setClientSearch,
  clientOptions,
  isLoadingClients,
  search,
  handleFilterChange,
  selectedShowTypes,
  showTypeOptions,
  handleMultiFilterChange,
  selectedPlatforms,
  platformOptions,
  selectedShowStandards,
  showStandardOptions,
}: FilterFieldsProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Client Combobox */}
      <div className="space-y-1.5">
        <Label>Client</Label>
        <AsyncCombobox
          value={search.client_id ?? ''}
          onChange={(val) => handleFilterChange('client_id', val)}
          onSearch={setClientSearch}
          options={clientOptions}
          isLoading={isLoadingClients}
          placeholder="Search Client..."
        />
      </div>

      {/* Show Types Dropdown */}
      <div className="space-y-1.5">
        <Label>Show Types</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedShowTypes.length > 0
                  ? selectedShowTypes.map((st) => st.name).join(', ')
                  : 'Any Show Type'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {showTypeOptions.map((opt) => {
              const isSelected = toArrayParam(search.show_type_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.show_type_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('show_type_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Platforms Dropdown */}
      <div className="space-y-1.5">
        <Label>Platforms</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedPlatforms.length > 0
                  ? selectedPlatforms.map((p) => p.name).join(', ')
                  : 'Any Platform'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {platformOptions.map((opt) => {
              const isSelected = toArrayParam(search.platform_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.platform_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('platform_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Show Standards Dropdown */}
      <div className="space-y-1.5">
        <Label>Show Standards</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {selectedShowStandards.length > 0
                  ? selectedShowStandards.map((s) => s.name).join(', ')
                  : 'Any Show Standard'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto" align="start">
            {showStandardOptions.map((opt) => {
              const isSelected = toArrayParam(search.show_standard_id)?.includes(opt.value) ?? false;
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isSelected}
                  onCheckedChange={() => {
                    const current = toArrayParam(search.show_standard_id) ?? [];
                    const next = isSelected
                      ? current.filter((val) => val !== opt.value)
                      : [...current, opt.value];
                    handleMultiFilterChange('show_standard_id', next);
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Record Presence Dropdown */}
      <div className="space-y-1.5">
        <Label>Performance Record Presence</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
            >
              <span className="truncate">
                {search.has_performance === 'true'
                  ? 'With Performance Records'
                  : search.has_performance === 'false'
                    ? 'Without Performance Records'
                    : 'All Shows'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px]" align="start">
            <DropdownMenuCheckboxItem
              checked={!search.has_performance || search.has_performance === 'all'}
              onCheckedChange={() => handleFilterChange('has_performance', 'all')}
              onSelect={(e) => e.preventDefault()}
            >
              All Shows
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={search.has_performance === 'true'}
              onCheckedChange={() => handleFilterChange('has_performance', 'true')}
              onSelect={(e) => e.preventDefault()}
            >
              With Performance Records
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={search.has_performance === 'false'}
              onCheckedChange={() => handleFilterChange('has_performance', 'false')}
              onSelect={(e) => e.preventDefault()}
            >
              Without Performance Records
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
