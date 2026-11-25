# Power BI Import Report — `fp-scenario-v2`

- **Source PBIP:** `fp-scenario-v2.pbip`
- **Page:** FP - Scenario Selection V2 (`cc861dc3b8d840d085ff`, 1920×1080)
- **Validation:** PASS (0 errors)

## Mapped (7)

| Category | Source                                                                   | Target                                              | Detail                                 |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------- |
| visual   | cardVisual (03f1675aeed67f3cdfcb)                                        | revenue_ac (kpi)                                    | sum(revenue) format=,.0f               |
| visual   | cardVisual (698288c7eace8f2ef18d)                                        | ac (kpi)                                            | sum(revenue) format=,.0f               |
| visual   | clusteredColumnChart "Revenue Development Over Time"                     | revenue_development_over_time (vega-lite bar)       | sum(revenue) by start_of_month         |
| visual   | clusteredColumnChart "Revenue Development Over Time"                     | revenue_development_over_time_2 (vega-lite bar)     | sum(revenue) by start_of_month         |
| slicer   | advancedSlicerVisual "Year Selection \| Single" (Dim Calendar.Year Text) | filter.year_selection (select on year_text)         | applies to 6 panel(s)                  |
| slicer   | listSlicer "Business Line" (DIM_Customers.Business_Line)                 | filter.business_line (multiselect on business_line) | applies to 6 panel(s)                  |
| dataset  | FCT_Summarized_Data.csv (+ 2 joined dimension CSVs)                      | 1874 rows                                           | hydrated via active TMDL relationships |

## Approximated (4)

| Category | Source                                    | Target                                 | Detail                                                                                 |
| -------- | ----------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| measure  | _Measures Main._Revenue AC                | sum(revenue)                           | unit-scaling denominator [_Denominator] dropped; use d3-format compact scaling instead |
| format   | _Measures Main._Revenue AC                | ,.0f                                   | dynamic formatStringDefinition fell back to default ",.0f"                             |
| visual   | pivotTable "Revenue Structure by Segment" | revenue_structure_by_segment (table)   | pivotTable flattened to 2-column data-table                                            |
| visual   | pivotTable "Revenue Structure by Segment" | revenue_structure_by_segment_2 (table) | pivotTable flattened to 2-column data-table                                            |

## Skipped (16)

| Category | Source                                                                       | Target | Detail                                                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| visual   | actionButton (cd7acdbc17e2c7a1a6ff)                                          | —      | decorative chrome / navigation visual                                                                                                                                                                          |
| visual   | image (5d9998367e16c2e0b6c0)                                                 | —      | decorative chrome / navigation visual                                                                                                                                                                          |
| visual   | actionButton (a44e526cceee7dd506e5)                                          | —      | decorative chrome / navigation visual                                                                                                                                                                          |
| visual   | shape (58b3129c352f31158515)                                                 | —      | decorative chrome / navigation visual                                                                                                                                                                          |
| visual   | shape (e9f22ad72417f03297da)                                                 | —      | decorative chrome / navigation visual                                                                                                                                                                          |
| measure  | _Measures Main._Revenue PY \| Equalized                                      | —      | complex DAX (time intelligence, CALCULATE filter context, multi-step VAR/RETURN): VAR __Last_Closed_Period = MAXX ( CALCULATETABLE ( FILTER ( ADDCOLUMNS ( ALL ( 'Dim Calendar'[Date] ), ...                   |
| measure  | _Measures Main._Revenue Target                                               | —      | complex DAX (non-trivial DAX expression): [_Revenue PY \| Equalized] * 2.5                                                                                                                                     |
| measure  | _Measures Main._Revenue Variance abs. PY                                     | —      | complex DAX (multi-step VAR/RETURN): VAR __Current = [_Revenue AC] VAR __Previous_Year = [_Revenue PY \| Equalized] VAR __Result = __Current - __Previous_Year RETURN __Result                                 |
| measure  | _Measures Main._Revenue Variance abs. PY \| Data Bar                         | —      | complex DAX (non-trivial DAX expression): [_Revenue Variance abs. PY]                                                                                                                                          |
| measure  | _Measures Main._Revenue Variance rel. PY                                     | —      | complex DAX (multi-step VAR/RETURN): VAR __AC_Value = [_Revenue AC] VAR __PY_Value = [_Revenue PY \| Equalized] VAR __Check = ISBLANK ( __AC_Value ) \|\| ISBLANK ( __PY_Value ) \|\| __AC_Value <= 0 \|\| ... |
| measure  | _Measures Main._Revenue Variance abs. Target                                 | —      | complex DAX (multi-step VAR/RETURN): VAR __Current = [_Revenue AC] VAR __Target = [_Revenue Target] VAR __Result = __Current - __Target RETURN __Result                                                        |
| measure  | _Measures Main._Revenue Variance abs. Target Data Bar                        | —      | complex DAX (non-trivial DAX expression): [_Revenue Variance abs. Target]                                                                                                                                      |
| measure  | _Measures Main._Revenue Variance rel. Target                                 | —      | complex DAX (multi-step VAR/RETURN): VAR __AC_Value = [_Revenue AC] VAR __Target_Value = [_Revenue Target] VAR __Check = ISBLANK ( __AC_Value ) \|\| ISBLANK ( __Target_Value ) \|\| __AC_Value <= 0 \|\| ...  |
| slicer   | advancedSlicerVisual "Scenario Selection" (TBL Scenario Selection.Name)      | —      | table "TBL Scenario Selection" is disconnected from primary fact table "FCT_Summarized_Data" (navigation/parameter slicer)                                                                                     |
| slicer   | advancedSlicerVisual "Scenario Selection" (TBL Scenario Selection.Name)      | —      | table "TBL Scenario Selection" is disconnected from primary fact table "FCT_Summarized_Data" (navigation/parameter slicer)                                                                                     |
| slicer   | advancedSlicerVisual "Metric Selection" (TBL Scenario Column Selection.Name) | —      | table "TBL Metric Selection" is disconnected from primary fact table "FCT_Summarized_Data" (navigation/parameter slicer)                                                                                       |
