/** Translate Power BI / .NET format strings into validated d3-format specifiers and Flint semantics. */
import { D3FormatString } from '../../src/spec/d3Format';
import type { FieldType } from '../../src/spec/schema';
import type { TmdlDataType } from './types';

export interface FormatMapping {
  d3Format: string;
  signed: boolean;
  isCurrency: boolean;
  isPercent: boolean;
  approximated: boolean;
  note?: string;
}

function safeD3(spec: string): string {
  return D3FormatString.safeParse(spec).success ? spec : ',.0f';
}

/** Map a Power BI / .NET formatString to a valid d3-format string. */
export function mapPowerBiFormat(formatString?: string, hasDynamicFormat = false): FormatMapping {
  if (!formatString || !formatString.trim()) {
    return {
      d3Format: ',.0f',
      signed: false,
      isCurrency: false,
      isPercent: false,
      approximated: hasDynamicFormat,
      note: hasDynamicFormat
        ? 'dynamic formatStringDefinition fell back to default ",.0f"'
        : undefined,
    };
  }

  // Positive section of multi-section Excel/.NET format string ("pos;neg;zero")
  const primary = formatString.split(';')[0]!.replace(/\\/g, '').trim();
  const signed = primary.startsWith('+');
  const signPrefix = signed ? '+' : '';

  // Currency symbols
  const isCurrency = /[$€£]/.test(primary);
  const currencyPrefix = primary.includes('$') ? '$' : '';

  // Percent
  if (primary.includes('%')) {
    const decMatch = /\.(0+)/.exec(primary);
    const decimals = decMatch ? Math.min(decMatch[1]!.length, 2) : 0;
    return {
      d3Format: safeD3(`${signPrefix}.${decimals}%`),
      signed,
      isCurrency: false,
      isPercent: true,
      approximated: false,
    };
  }

  // Numeric with grouping / decimals
  if (/[#0]/.test(primary)) {
    const decMatch = /\.(0+)/.exec(primary);
    const decimals = decMatch ? Math.min(decMatch[1]!.length, 2) : 0;
    const grouped = primary.includes(',') ? ',' : '';
    const d3 = safeD3(`${currencyPrefix}${signPrefix}${grouped}.${decimals}f`);
    return {
      d3Format: d3,
      signed,
      isCurrency,
      isPercent: false,
      approximated: isCurrency && !currencyPrefix,
      note:
        isCurrency && !currencyPrefix
          ? `non-USD currency format "${formatString}" approximated as "${d3}"`
          : undefined,
    };
  }

  return {
    d3Format: ',.0f',
    signed: false,
    isCurrency: false,
    isPercent: false,
    approximated: true,
    note: `unrecognized Power BI format "${formatString}" fell back to ",.0f"`,
  };
}

/** Map TMDL dataType to DashboardSpec FieldType. */
export function mapTmdlDataType(dataType: TmdlDataType): FieldType {
  switch (dataType) {
    case 'dateTime':
      return 'temporal';
    case 'int64':
    case 'double':
    case 'decimal':
      return 'quantitative';
    default:
      return 'nominal';
  }
}

/** Infer a registered Flint semantic type for a dataset field. */
export function inferFlintSemantic(
  fieldName: string,
  fieldType: FieldType,
  format?: FormatMapping,
): string | { semanticType: string; unit?: string } {
  const lower = fieldName.toLowerCase();
  if (fieldType === 'temporal') return 'Date';
  if (fieldType === 'quantitative') {
    if (
      format?.isPercent ||
      lower.includes('margin') ||
      lower.includes('pct') ||
      lower.includes('rel')
    ) {
      return 'Percentage';
    }
    if (
      format?.isCurrency ||
      lower.includes('revenue') ||
      lower.includes('sales') ||
      lower.includes('cost') ||
      lower.includes('profit') ||
      lower.includes('amount') ||
      lower.includes('variance')
    ) {
      return { semanticType: 'Amount', unit: 'USD' };
    }
    if (lower.includes('count') || lower.includes('order') || lower.includes('customer')) {
      return 'Count';
    }
    return 'Quantity';
  }
  if (lower.includes('country')) return 'Country';
  if (lower.includes('region')) return 'Region';
  if (lower.includes('customer') || lower.includes('manager') || lower.includes('name'))
    return 'Name';
  return 'Category';
}
