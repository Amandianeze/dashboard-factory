/** Internal intermediate representation (IR) types for the Power BI (.pbip) importer. */
import type { FieldType } from '../../src/spec/schema';

export interface PbipPaths {
  pbipFile: string;
  projectName: string;
  reportDir: string;
  semanticModelDir: string;
}

export interface PbirPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

export type PbirProjectionKind =
  'Column' | 'Measure' | 'Aggregation' | 'Arithmetic' | 'NativeVisualCalculation' | 'Other';

export interface PbirProjection {
  bucket: string;
  kind: PbirProjectionKind;
  entity?: string;
  property?: string;
  queryRef: string;
  nativeQueryRef?: string;
  displayName?: string;
  aggregationFn?: number;
}

export interface PbirVisual {
  id: string;
  visualType: string;
  title?: string;
  isHidden: boolean;
  isGroup: boolean;
  position: PbirPosition;
  projections: PbirProjection[];
  singleSelect?: boolean;
}

export interface PbirPage {
  id: string;
  displayName: string;
  width: number;
  height: number;
  isTooltip: boolean;
  isHidden: boolean;
  visuals: PbirVisual[];
}

export type TmdlDataType =
  | 'string'
  | 'int64'
  | 'double'
  | 'dateTime'
  | 'decimal'
  | 'boolean'
  | 'binary'
  | 'variant'
  | 'unknown';

export interface TmdlColumn {
  name: string;
  table: string;
  dataType: TmdlDataType;
  formatString?: string;
  summarizeBy?: string;
  sourceColumn?: string;
  isHidden: boolean;
  isKey: boolean;
}

export interface TmdlMeasure {
  name: string;
  table: string;
  expression: string;
  formatString?: string;
  hasDynamicFormat: boolean;
  displayFolder?: string;
  isHidden: boolean;
}

export interface TmdlTable {
  name: string;
  isHidden: boolean;
  isPrivate: boolean;
  isCalculationGroup: boolean;
  columns: Map<string, TmdlColumn>;
  measures: Map<string, TmdlMeasure>;
}

export interface TmdlRelationship {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  isActive: boolean;
  fromCardinality: 'one' | 'many';
  toCardinality: 'one' | 'many';
  crossFilteringBehavior: 'oneDirection' | 'bothDirections' | 'automatic';
}

export interface TmdlModel {
  culture: string;
  tables: Map<string, TmdlTable>;
  relationships: TmdlRelationship[];
}

export type AggregateOp = 'sum' | 'mean' | 'min' | 'max' | 'count' | 'distinct';

export type DaxClassification =
  | {
      kind: 'placeholder';
      reason: string;
    }
  | {
      kind: 'simple';
      table: string;
      column: string;
      aggregate: AggregateOp;
    }
  | {
      kind: 'unit-scaled';
      table: string;
      column: string;
      aggregate: AggregateOp;
      reason: string;
    }
  | {
      kind: 'complex';
      reason: string;
      expression: string;
      tracedTable?: string;
      tracedColumn?: string;
    };

export interface ReportEntry {
  category: 'visual' | 'slicer' | 'measure' | 'layout' | 'format' | 'dataset';
  source: string;
  target?: string;
  detail: string;
}

export interface ImportReport {
  sourcePbip: string;
  pageId: string;
  pageName: string;
  canvas: { width: number; height: number };
  dashboardId: string;
  mapped: ReportEntry[];
  approximated: ReportEntry[];
  skipped: ReportEntry[];
  validationErrors: string[];
}

export interface DatasetColumnSpec {
  field: string;
  type: FieldType;
  sourceTable: string;
  sourceColumn: string;
  formatString?: string;
  isPlaceholderMeasure?: boolean;
  signed?: boolean;
}
