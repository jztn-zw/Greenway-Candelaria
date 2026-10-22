# MENRO analytics PDF export

In **Admin > Analytics**, select the period and barangay, then choose **Export PDF**.
The **Overview** tab exports all seven sections. Each other tab exports only its
own section: Collection Efficiency, Missed Collections, Reports & Incidents,
Residents, Driver Operations, or Barangay Coverage. The report title and filename
identify the selected section.

Driver Operations includes **Distance per Collection Run**, with the dated route,
collector, saved truck identity and kilometres recorded during finished
(`COMPLETED`/`PARTIAL`) runs. Selecting a barangay selects the runs that served it;
the displayed distance remains the full run distance, including other barangays.
Missing usable GPS is `Unavailable`, while recorded stationary travel can be
`0.00 km`. Values are GPS estimates and flag excluded gaps or unreliable fixes.
The Overview PDF includes this table; the other focused reports do not.

- Uses `public/report-templates/menro-letterhead.pdf`, copied unchanged from the
  supplied MENRO header/footer PDF. Its A4 size, logos, header and footer repeat on
  every page. The source transparency group is retained for PDFium compatibility.
- Body margins are measured from that template. Tables wrap long cells, repeat
  column headings on continuation pages, and split oversized cells without dropping
  their remaining text. Page numbers sit above the original footer.
- Report text and table lines are black. Tables use full cell borders on white
  pages, with bold column headings and no colored or alternating row fills. The
  original letterhead and its seals remain unchanged.
- The report takes one snapshot of the loaded dashboard, selected tab and barangay label.
  Export is disabled during requests and after refresh failures so retained results
  cannot be exported under a different filter. Changing filters or tabs during
  generation does not relabel a report already being generated.
- Period dates and the generated timestamp use Philippine time. Current queue,
  vehicle, assignment and resident totals are identified as snapshots. Ranked lists
  retain the API/dashboard limits (top 10 areas and top 8 missed-stop reasons).
- No raw resident records or new API/database operations are added. The existing
  admin-only analytics endpoint remains the data source.
- `pdf-lib` and `@pdf-lib/fontkit` load on demand when exporting. Bitstream Vera
  fonts are embedded for accented names; their redistribution license is in
  `public/fonts/bitstream-vera-license.txt`. The letterhead PDF and fonts must be
  deployed with the client public assets.

## Validation

Run from `client/`:

```powershell
npm test -- src/features/admin/analytics/analytics.pdf.test.ts src/features/admin/analytics/AdminAnalyticsDashboard.test.tsx
node node_modules/typescript/bin/tsc -b --pretty false
npx eslint src/features/admin/analytics/analytics.pdf.ts src/features/admin/analytics/analytics.pdf.test.ts src/features/admin/analytics/AdminAnalyticsDashboard.tsx src/features/admin/analytics/AdminAnalyticsDashboard.test.tsx src/components/loading/PageLoadingSkeletons.tsx
npm run build
```

To generate a clearly labeled fixture report for visual review:

```powershell
$env:WRITE_ANALYTICS_PDF_SAMPLE='1'
npm test -- src/features/admin/analytics/analytics.pdf.test.ts
```

This writes overview and driver-operation samples under `output/pdf/` at the
repository root and a stress report under `tmp/pdfs/`. Review the rendered pages when changing the
template, fonts or layout constants. Production data and authenticated live API
delivery are outside these fixture checks.
