# Power BI Import Report — `variance-waterfall-extended`

- **Source PBIP:** `variance-waterfall-extended.pbip`
- **Page:** Variance Waterfall - Extended (`b255974c3bcc20f0c0bc`, 1920×1080)
- **Validation:** PASS (0 errors)

## Mapped (4)

| Category | Source                                                                        | Target                                              | Detail                                           |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| visual   | clusteredColumnChart "Revenue Development By Dates"                           | revenue_development_by_dates (vega-lite bar)        | sum(customer_rev_extended_yoy) by start_of_month |
| slicer   | advancedSlicerVisual "Year Selection \| Single" (Dim Calendar.Year Text)      | filter.year_selection (select on year_text)         | applies to 3 panel(s)                            |
| slicer   | advancedSlicerVisual "Month Selection \| Multiple" (Dim Calendar.Month Short) | filter.month_selection (multiselect on month_short) | applies to 3 panel(s)                            |
| slicer   | listSlicer "Business Line" (DIM_Customers.Business_Line)                      | filter.business_line (multiselect on business_line) | applies to 3 panel(s)                            |

## Approximated (5)

| Category | Source                                            | Target                                                   | Detail                                                                                 |
| -------- | ------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| visual   | waterfallChart "YoY Variance by Customer Segment" | yoy_variance_by_customer_segment (flint Waterfall Chart) | mapped to Flint Waterfall Chart; sub-breakdown bucket omitted                          |
| measure  | _Measures Main._Revenue AC                        | sum(revenue)                                             | unit-scaling denominator [_Denominator] dropped; use d3-format compact scaling instead |
| format   | _Measures Main._Revenue AC                        | ,.0f                                                     | dynamic formatStringDefinition fell back to default ",.0f"                             |
| visual   | pivotTable (f200715756f986ff603c)                 | breakdown_by_customer (table)                            | pivotTable flattened to 2-column data-table                                            |
| dataset  | FCT_Summarized_Data                               | 144 synthetic rows                                       | generated deterministic fixture rows from TMDL column types (no --csv-dir supplied)    |

## Skipped (14)

| Category | Source                                                                | Target | Detail                                                                                                                                                                                                                                            |
| -------- | --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| visual   | actionButton (4ce18eb7d101c384049b)                                   | —      | decorative chrome / navigation visual                                                                                                                                                                                                             |
| visual   | textbox (ec99f2dc20ecc0bbee86)                                        | —      | decorative chrome / navigation visual                                                                                                                                                                                                             |
| visual   | image (2603bf2232e659d4fba2)                                          | —      | decorative chrome / navigation visual                                                                                                                                                                                                             |
| visual   | actionButton (efaaa54d5b9406257324)                                   | —      | decorative chrome / navigation visual                                                                                                                                                                                                             |
| visual   | shape (282a53b0f2e1d958423f)                                          | —      | decorative chrome / navigation visual                                                                                                                                                                                                             |
| measure  | TBL Waterfall Breakdown \| PY._Waterfall By Customer Segment \| Basic | —      | complex DAX (SWITCH branching, multi-step VAR/RETURN): VAR __SelectedCategory = SELECTEDVALUE ( 'TBL Waterfall Breakdown \| PY'[Name Short]) VAR __Breakdown_Scope_Check = ISINSCOPE ( 'TBL Customer Breakdown'[Name]) \|\| ...                   |
| measure  | _Measures Main._Customer Count \| Extended (YoY) Name                 | —      | complex DAX (SWITCH branching, multi-step VAR/RETURN): VAR __Selected_Segment = VALUES ( 'TBL Customer Breakdown'[Name] ) VAR __Customer_Table = ADDCOLUMNS ( VALUES ( DIM_Customers[Customer_ID] ), "@Rev_Current",...                           |
| measure  | _Measures Main._Revenue PY \| Equalized                               | —      | complex DAX (time intelligence, CALCULATE filter context, multi-step VAR/RETURN): VAR __Last_Closed_Period = MAXX ( CALCULATETABLE ( FILTER ( ADDCOLUMNS ( ALL ( 'Dim Calendar'[Date] ), ...                                                      |
| measure  | _Measures Main._Revenue Variance abs. PY                              | —      | complex DAX (multi-step VAR/RETURN): VAR __Current = [_Revenue AC] VAR __Previous_Year = [_Revenue PY \| Equalized] VAR __Result = __Current - __Previous_Year RETURN __Result                                                                    |
| measure  | _Measures Main.Placeholder v1                                         | —      | BLANK() placeholder measure                                                                                                                                                                                                                       |
| measure  | _Measures Main._Revenue Variance abs. PY \| Data Bar                  | —      | complex DAX (non-trivial DAX expression): [_Revenue Variance abs. PY]                                                                                                                                                                             |
| measure  | _Measures Main._Revenue Variance rel. PY                              | —      | complex DAX (multi-step VAR/RETURN): VAR __AC_Value = [_Revenue AC] VAR __PY_Value = [_Revenue PY \| Equalized] VAR __Check = ISBLANK ( __AC_Value ) \|\| ISBLANK ( __PY_Value ) \|\| __AC_Value <= 0 \|\| ...                                    |
| measure  | _Measures Main._Customer Rev \| Extended (YoY)                        | —      | complex DAX (CALCULATE filter context, SWITCH branching, multi-step VAR/RETURN): VAR __Selected_Segment = VALUES ( 'TBL Customer Breakdown'[Name] ) VAR __Customer_Table = ADDCOLUMNS ( VALUES ( DIM_Customers[Customer_ID] ), "@Rev_Current",... |
| slicer   | slicer (TBL Customer Breakdown.Name Group)                            | —      | table "TBL Customer Breakdown" is disconnected from primary fact table "FCT_Summarized_Data" (navigation/parameter slicer)                                                                                                                        |
