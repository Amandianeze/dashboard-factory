import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../scripts/powerbi/build-dataset';
import {
  inferFlintSemantic,
  mapPowerBiFormat,
  mapTmdlDataType,
} from '../../scripts/powerbi/map-format';
import { mapPixelsToGrid, type PlacedPanel } from '../../scripts/powerbi/map-layout';
import { classifyDaxMeasure } from '../../scripts/powerbi/parse-dax';
import { parseRelationshipsTmdl, parseTableTmdl } from '../../scripts/powerbi/parse-tmdl';
import { resolvePbipPaths, sanitizePowerBiText } from '../../scripts/powerbi/read-pbip';
import type { ReportEntry, TmdlMeasure } from '../../scripts/powerbi/types';

describe('Power BI importer — TMDL parser', () => {
  it('parses tables, columns, single-line & fenced measures, and calculation groups', () => {
    const tmdl = [
      "table 'Sales Data'",
      '\tisHidden',
      '\tcalculationGroup',
      "\tmeasure 'Total Revenue' = SUM('Sales Data'[Revenue])",
      '\t\tformatString: $#,0',
      '\t\tdisplayFolder: Core',
      "\tmeasure 'Multi Line' = ```",
      '\t\tDIVIDE(',
      "\t\t\tSUM('Sales Data'[Revenue]),",
      '\t\t\t[_Denominator]',
      '\t\t)',
      '\t\t```',
      '\t\tformatStringDefinition = [_Fmt] & ""',
      "\tcolumn 'Order Date'",
      '\t\tdataType: dateTime',
      '\t\tsourceColumn: Order Date',
      '\tcolumn Revenue',
      '\t\tdataType: double',
      '\t\tformatString: $#,0.00',
    ].join('\n');

    const table = parseTableTmdl(tmdl);
    expect(table).not.toBeNull();
    expect(table?.name).toBe('Sales Data');
    expect(table?.isHidden).toBe(true);
    expect(table?.isCalculationGroup).toBe(true);
    expect(table?.measures.get('Total Revenue')?.expression).toBe("SUM('Sales Data'[Revenue])");
    expect(table?.measures.get('Total Revenue')?.formatString).toBe('$#,0');
    expect(table?.measures.get('Multi Line')?.expression).toContain('DIVIDE(');
    expect(table?.measures.get('Multi Line')?.hasDynamicFormat).toBe(true);
    expect(table?.columns.get('Order Date')?.dataType).toBe('dateTime');
    expect(table?.columns.get('Revenue')?.dataType).toBe('double');
  });

  it('parses active and inactive relationships with quoted table/column names', () => {
    const rels = parseRelationshipsTmdl(
      [
        "relationship 'rel-1'",
        "\tfromColumn: FCT_Sales.'Order Date'",
        "\ttoColumn: 'Dim Calendar'.Date",
        '',
        "relationship 'rel-2'",
        '\tisActive: false',
        '\tcrossFilteringBehavior: bothDirections',
        "\tfromColumn: 'Dim Calendar'.Date",
        "\ttoColumn: 'Dim Calendar Suppl'.Date",
      ].join('\n'),
    );
    expect(rels).toHaveLength(2);
    expect(rels[0]).toMatchObject({
      fromTable: 'FCT_Sales',
      fromColumn: 'Order Date',
      toTable: 'Dim Calendar',
      toColumn: 'Date',
      isActive: true,
    });
    expect(rels[1]).toMatchObject({
      isActive: false,
      crossFilteringBehavior: 'bothDirections',
    });
  });
});

describe('Power BI importer — DAX classifier', () => {
  const makeMeasure = (name: string, expression: string): TmdlMeasure => ({
    name,
    table: '_Measures',
    expression,
    hasDynamicFormat: false,
    isHidden: false,
  });

  it('maps simple aggregates directly', () => {
    expect(classifyDaxMeasure(makeMeasure('Rev', 'SUM(FCT_Sales[Revenue])'))).toEqual({
      kind: 'simple',
      table: 'FCT_Sales',
      column: 'Revenue',
      aggregate: 'sum',
    });
    expect(
      classifyDaxMeasure(makeMeasure('Cust', "DISTINCTCOUNT('Dim Cust'[Customer ID])")),
    ).toEqual({
      kind: 'simple',
      table: 'Dim Cust',
      column: 'Customer ID',
      aggregate: 'distinct',
    });
    expect(classifyDaxMeasure(makeMeasure('Avg', 'AVERAGE(FCT_Sales[Price])'))).toMatchObject({
      kind: 'simple',
      aggregate: 'mean',
    });
  });

  it('unwraps unit-scaled DIVIDE(SUM(...), [_Denominator]) as approximated', () => {
    const res = classifyDaxMeasure(
      makeMeasure('_Revenue AC', 'DIVIDE ( SUM ( FCT_Summarized_Data[Revenue] ), [_Denominator] )'),
    );
    expect(res.kind).toBe('unit-scaled');
    if (res.kind === 'unit-scaled') {
      expect(res.table).toBe('FCT_Summarized_Data');
      expect(res.column).toBe('Revenue');
      expect(res.aggregate).toBe('sum');
    }
  });

  it('filters BLANK(), SVG, and hex colour visual hacks as placeholders', () => {
    expect(classifyDaxMeasure(makeMeasure('Placeholder v1', 'BLANK()')).kind).toBe('placeholder');
    expect(
      classifyDaxMeasure(makeMeasure('Data Bar', '"data:image/svg+xml;utf8,<svg></svg>"')).kind,
    ).toBe('placeholder');
    expect(classifyDaxMeasure(makeMeasure('Pos Color', '"#1f77b4"')).kind).toBe('placeholder');
  });

  it('flags complex time-intelligence DAX and traces underlying column', () => {
    const res = classifyDaxMeasure(
      makeMeasure(
        'Rev PY',
        "CALCULATE(SUM(FCT_Sales[Revenue]), SAMEPERIODLASTYEAR('Dim Calendar'[Date]))",
      ),
    );
    expect(res.kind).toBe('complex');
    if (res.kind === 'complex') {
      expect(res.reason).toContain('time intelligence');
      expect(res.tracedTable).toBe('FCT_Sales');
      expect(res.tracedColumn).toBe('Revenue');
    }
  });
});

describe('Power BI importer — formats & layout', () => {
  it('translates Power BI format strings into valid d3-format specifiers', () => {
    expect(mapPowerBiFormat('$#,0')).toMatchObject({ d3Format: '$,.0f', isCurrency: true });
    expect(mapPowerBiFormat('0.00%;-0.00%;0.00%')).toMatchObject({
      d3Format: '.2%',
      isPercent: true,
    });
    expect(mapPowerBiFormat('+#,0;-#,0;0')).toMatchObject({ d3Format: '+,.0f', signed: true });
    expect(mapPowerBiFormat(undefined, true)).toMatchObject({
      d3Format: ',.0f',
      approximated: true,
    });
    expect(mapTmdlDataType('dateTime')).toBe('temporal');
    expect(inferFlintSemantic('revenue', 'quantitative', mapPowerBiFormat('$#,0'))).toEqual({
      semanticType: 'Amount',
      unit: 'USD',
    });
  });

  it('snaps pixel boxes to 12-column rows, resolves overlaps, and strips invisible title marks', () => {
    expect(sanitizePowerBiText('\u200e \u200e  Portfolio   Analysis \ufeff')).toBe(
      'Portfolio Analysis',
    );

    const approx: ReportEntry[] = [];
    const panels: PlacedPanel[] = [
      {
        panelId: 'kpi_a',
        kind: 'kpi-card',
        title: 'A',
        position: { x: 200, y: 20, width: 300, height: 100, z: 1 },
      },
      {
        panelId: 'kpi_b',
        kind: 'kpi-card',
        title: 'B',
        position: { x: 520, y: 20, width: 300, height: 100, z: 2 },
      },
      {
        panelId: 'chart_top',
        kind: 'chart-panel',
        title: 'Top',
        position: { x: 200, y: 150, width: 620, height: 300, z: 10 },
      },
      {
        panelId: 'chart_under',
        kind: 'chart-panel',
        title: 'Under',
        position: { x: 210, y: 155, width: 610, height: 295, z: 5 },
      },
    ];
    const rows = mapPixelsToGrid(panels, 720, approx);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.height).toBe(132);
    expect(rows[0]!.cells.reduce((s, c) => s + c.span, 0)).toBe(12);
    expect(rows[1]!.cells).toEqual([{ panel: 'chart_top', span: 12 }]);
    expect(rows[2]!.cells).toEqual([{ panel: 'chart_under', span: 12 }]);
    expect(approx.some((e) => e.category === 'layout' && e.source === 'chart_under')).toBe(true);
  });

  it('rejects PBIR-Legacy (v1.0) reports cleanly and parses RFC-4180 CSV', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pbi-legacy-'));
    try {
      mkdirSync(join(tmp, 'Demo.Report'), { recursive: true });
      writeFileSync(
        join(tmp, 'Demo.pbip'),
        JSON.stringify({ version: '1.0', artifacts: [{ report: { path: 'Demo.Report' } }] }),
      );
      writeFileSync(
        join(tmp, 'Demo.Report', 'definition.pbir'),
        JSON.stringify({
          version: '1.0',
          datasetReference: { byPath: { path: '../Demo.SemanticModel' } },
        }),
      );
      expect(() => resolvePbipPaths(tmp)).toThrow(/PBIR-Legacy/i);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    const csv = parseCsv('id,name,val\n1,"Acme, Inc.",42.5\n2,"Quote ""X""",10\n');
    expect(csv).toEqual([
      { id: '1', name: 'Acme, Inc.', val: '42.5' },
      { id: '2', name: 'Quote "X"', val: '10' },
    ]);
  });
});
