# Sample prompt: build a screen from DESIGN.md alone

Gate 2 evidence that `DESIGN.md` is enough for an agent to build an on-brand screen. The agent gets
this prompt and the file path, and nothing else from the repo. The result is checked mechanically:
every colour it uses must come from the DESIGN.md front matter. See `gate-2.md` for the outcome.

---

You are building one screen for a product whose design system is described in `DESIGN.md`. Read
`DESIGN.md` (absolute path given below) and **no other file in that repository**. Don't look at its
source code, tokens or other docs; the point is to test whether DESIGN.md alone is enough.

Build an **"Orders" admin list page** as a single self-contained HTML file (inline `<style>`, no
external CSS or JS, no web fonts to download: name the font family and let it fall back). It needs:

1. The page title band (title + one-line description).
2. A row of three KPI panels: "Open orders" 1,284; "Revenue this week" $482,910; "Change vs last
   week" −3.4% (a negative delta).
3. A filter row with four status chips ("All" selected, "Open", "Shipped", "Cancelled"), plus one
   disabled chip ("Archived").
4. A panel containing a table of 6 orders (order id, customer, date, status, amount) with
   right-aligned tabular figures for the amounts.
5. A small inline-SVG bar chart panel, "Orders by region" (4 regions), following the Data
   Visualization rules.

Rules: use only values from DESIGN.md's front matter (colours, typography, rounded, spacing), and
define them once as CSS custom properties at the top of the stylesheet. Follow the prose (Do's and
Don'ts, Data Visualization, Content & Formatting). Include hover, pressed and keyboard-focus styles
for the chips. Write the file to the output path given below and reply with a short list of any
places where DESIGN.md was ambiguous or missing something you needed.
