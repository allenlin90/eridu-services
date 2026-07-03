import type {
  TaskReportScope,
  TaskReportSelectedColumn,
  TaskReportSourcesResponse,
} from '@eridu/api-types/task-management';

/** A single template source descriptor as returned by source discovery. */
export type TemplateSource = TaskReportSourcesResponse['sources'][number];
/** A selectable field descriptor inside a template source. */
export type TemplateSourceField = TemplateSource['fields'][number];
/** A canonical shared-field entry (merged across templates). */
export type SharedFieldEntry = TaskReportSourcesResponse['shared_fields'][number];

export type ReportColumnPickerProps = {
  studioId: string;
  scope: TaskReportScope | null;
  selectedColumns: TaskReportSelectedColumn[];
  onChange: (columns: TaskReportSelectedColumn[]) => void;
  sourcesData?: TaskReportSourcesResponse;
};

/** A selected column enriched with its provenance group, detail line, and extra-column eligibility. */
export type SelectedColumnDescriptor = TaskReportSelectedColumn & {
  groupLabel: string;
  detail: string;
  canIncludeExtra: boolean;
};

/** Built-in (non-template) picker column. */
export type SystemColumn = { key: string; label: string };

/**
 * A per-loop column derived from a canonical shared field (e.g. `gmv_l1`); the
 * key is what the user actually selects, the canonical entry only groups them.
 */
export type DerivedSharedColumn = { key: string; label: string; type: TaskReportSelectedColumn['type']; group?: string };

/** A shared field augmented with its derived per-loop columns (all + currently visible). */
export type SharedFieldView = SharedFieldEntry & {
  derivedColumns: DerivedSharedColumn[];
  visibleDerivedColumns: DerivedSharedColumn[];
};

/** Shared fields grouped by category for rendering. */
export type SharedFieldCategoryGroup = { category: string; fields: SharedFieldView[] };

/** A template source prepared for panel rendering (filtered fields + selection counts). */
export type TemplatePanel = {
  source: TemplateSource;
  visibleFields: TemplateSourceField[];
  customFieldCount: number;
  selectedCustomFieldCount: number;
  shouldRenderPanel: boolean;
};

/** Adds/removes a column from the selection; matches the picker's `toggleColumn`. */
export type ToggleColumnFn = (
  fieldKey: string,
  fieldLabel: string,
  fieldType: TaskReportSelectedColumn['type'] | undefined,
  checked: boolean,
) => void;
