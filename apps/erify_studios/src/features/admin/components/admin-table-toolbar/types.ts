import type { Column, Table } from '@tanstack/react-table';
import type { DateRange } from 'react-day-picker';

/**
 * Searchable column configuration for admin tables
 */
export type SearchableColumn = {
  id: string;
  title: string;
  type?: 'text' | 'date-range' | 'select';
  options?: Array<{ label: string; value: string }>;
};

/**
 * Filter value types for different filter types
 */
export type FilterValue = string | DateRange | undefined;

/**
 * Props for the main toolbar component
 */
export type AdminTableToolbarProps<TData> = {
  table: Table<TData>;
  searchColumn?: string;
  searchableColumns?: SearchableColumn[];
  searchPlaceholder?: string;
  /** Columns to show as quick filters inline (by id) */
  quickFilterColumns?: string[];
};

/**
 * Props for the search input component
 */
export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Props for the filter popover component
 */
export type FilterPopoverProps<TData> = {
  table: Table<TData>;
  searchableColumns: SearchableColumn[];
  excludeColumns?: string[];
  featuredColumns?: string[];
  onReset: () => void;
  activeFilterCount: number;
};

/**
 * Props for individual filter inputs in the popover
 */
export type FilterInputProps<TData> = {
  column: Column<TData, unknown>;
  config: SearchableColumn;
};

/**
 * Props for the filter chips component
 */
export type FilterChipsProps<TData> = {
  table: Table<TData>;
  searchableColumns: SearchableColumn[];
  primaryColumnId?: string;
  onClearAll: () => void;
};

/**
 * Active filter representation for display
 */
export type ActiveFilter = {
  id: string;
  title: string;
  displayValue: string;
  type: SearchableColumn['type'];
};
