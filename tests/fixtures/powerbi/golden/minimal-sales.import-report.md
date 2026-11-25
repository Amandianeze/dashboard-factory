# Power BI Import Report — `minimal-sales`

- **Source PBIP:** `minimal-sales.pbip`
- **Page:** Minimal Sales Overview (`sales_overview_page`, 1280×720)
- **Validation:** PASS (0 errors)

## Mapped (9)

| Category | Source                                 | Target                                   | Detail                                       |
| -------- | -------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| measure  | Sales.Total Revenue                    | sum(revenue)                             | simple DAX aggregate mapped directly         |
| visual   | card "Total Revenue"                   | total_revenue (kpi)                      | sum(revenue) format=$,.0f                    |
| measure  | Sales.Active Customers                 | distinct(customerid)                     | simple DAX aggregate mapped directly         |
| visual   | card "Active Customers"                | active_customers (kpi)                   | distinct(customerid) format=,.0f             |
| visual   | lineChart "Revenue Trend by Region"    | revenue_trend_by_region (vega-lite line) | sum(revenue) by order_date grouped by region |
| visual   | clusteredBarChart "Revenue by Product" | revenue_by_product (vega-lite bar)       | sum(revenue) by product                      |
| measure  | Sales.Avg Order Value                  | mean(revenue)                            | simple DAX aggregate mapped directly         |
| visual   | tableEx "Sales Breakdown"              | sales_breakdown (table)                  | 3 columns                                    |
| slicer   | slicer "Region" (Regions.Region)       | filter.region (multiselect on region)    | applies to 5 panel(s)                        |

## Approximated (1)

| Category | Source | Target             | Detail                                                                              |
| -------- | ------ | ------------------ | ----------------------------------------------------------------------------------- |
| dataset  | Sales  | 144 synthetic rows | generated deterministic fixture rows from TMDL column types (no --csv-dir supplied) |

## Skipped (0)

_None._
