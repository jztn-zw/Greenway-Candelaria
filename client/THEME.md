# GreenWay colors

## UI capitalization

Use title case for page and section headings, field labels, short actions, table headers, KPI labels, and status badges. Keep articles, conjunctions, and short prepositions lowercase within titles (for example, "Reports by Barangay"). Capitalize action particles such as "Log Out" and "Zoom In".

Use sentence case for descriptions, helper and validation messages, search placeholders, loading messages, and FAQ questions. Preserve GreenWay, MENRO, GPS, AM/PM, measurement units, proper names, and user-entered content. Change display copy only; keep identifiers and API values unchanged.

Edit the color variables in `src/index.css` to change the website palette.

The public landing page scopes softer surfaces and a deeper light-mode teal in `src/features/landing/LandingPage.css`. These overrides affect backgrounds, cards, fields, muted text, and primary action states; shared action and category badge recipes keep their system roles. Resident, collector, and admin pages use the global palette.

- `:root` defines the light theme and shared color tones.
- `.dark` overrides surfaces, text, and interactive colors for dark mode.
- `--primary` and `--primary-foreground` control main actions and their text.
- `--button-*-hover`, `--button-*-active`, and `--button-tint*` control shared button states. Filled actions use opaque hover colors, while outlined and ghost actions use consistent neutral or semantic tints. Dark mode keeps the same roles with theme-appropriate contrast.
- `--accent` is the subtle selection background; `--highlight` is the bright green accent.
- `--background`, `--card`, `--popover`, `--border`, and `--input` control surfaces.
- `--field-background` and `--field-placeholder` control all shared inputs, text areas, and selects. Light fields use white card-colored surfaces, neutral-gray borders, and readable muted placeholders. Dark fields blend the page background with the card surface and use muted placeholder text at 95% opacity.
  Autofilled inputs use the same field surface and foreground colors while preserving browser autofill and keyboard focus rings.
- `--success`, `--warning`, `--info`, and `--destructive` identify statuses. Their foreground tokens are for readable status text.
- `--badge-*-background`, `--badge-*-foreground`, and `--badge-*-border` control badge colors in both themes. `--badge-tint` and `--badge-border-tint` set the shared tint strength. Use `getStatusBadgeStyle` or `getCategoryBadgeColors` from `src/components/ui/badgeStyles.ts` for labels, and `badgeStyles` for explicit color roles. The same status or category must use the same recipe across admin, collector, resident, cards, tables, and dialogs. Keep badges passive; preserve their existing size and layout.
- `--chart-1` through `--chart-6` supply chart and calendar categories.

Use semantic Tailwind utilities such as `bg-card`, `text-foreground`, and `text-success-foreground` in new components. Existing green, amber, blue, purple, red, and neutral utility names also resolve to these global color tones through `tailwind.config.ts`.

Use `Button` variants for actions: default for save/create/submit, outline for cancel and secondary actions, ghost for neutral icon actions, primary-ghost for green navigation links, and destructive variants for delete/clear/sign-out. Warning variants are reserved for caution actions such as skipping a stop. Native buttons can use the matching `gw-action-*` color recipe while keeping their current size and layout. Avoid page-specific background, text, or hover overrides on these actions; use an appropriate variant instead. Selected tabs, calendar days, and interactive cards keep their selection styles. Field triggers (`gw-field`) are excluded from button colors.

Filter tabs keep their bordered card surfaces for inactive options and the primary fill for the selected option. Do not apply action-button recipes to filter tabs, breadcrumb links, or carousel indicator dots; preserve their navigation styling.
Breadcrumbs use a subtle text-color change on hover, without an underline or filled background.

Route history uses the system's global typography sizes: page titles stay 24px/30px responsively, route row titles use 14px body text, and metadata uses 12px caption text. Its filters and secondary actions match the existing compact controls at 36px high with 12px text. Keep other collector pages' existing sizing and layouts.

Use global radius tokens through named utilities such as `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-modal`, and `rounded-full`. Match each component's existing radius recipe, including loading skeletons. Do not introduce custom radius values or arbitrary pixel-radius classes for individual pages or components.

Admin dialogs use `AdminModal` from `src/components/admin/AdminModal.tsx` for forms, `AdminConfirmationDialog` for confirmations and `AdminUnsavedChangesDialog` for discard prompts. They reuse the shared Radix dialogs, with consistent header/body/footer spacing, semantic icons, viewport limits and mobile touch targets. Use `pending` on forms to protect an in-flight save. Complex editors can use `AdminModalContent` with `gw-modal-header`, `gw-modal-body` and `gw-modal-footer` sections, retaining their existing forms and unsaved-change handling. Keep field and button variants semantic; use `tone="danger"` or `tone="warning"` when the form needs a matching header icon.

Toast titles and text descriptions must not contain emojis. Preserve existing message wording and punctuation, and use the shared `@/lib/toast` helper across web roles.

DOM and SVG colors can use `hsl(var(--primary))`. Canvas renderers must use `readThemeColor` from `src/lib/themeColors.ts` to resolve the current CSS color before drawing. Keep third-party logo colors and external basemap artwork intact.
