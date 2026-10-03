import "./settings.css";

const row = "resident-settings-row -mx-2 flex min-w-0 items-center justify-between gap-3 rounded-xl border-b border-border/40 px-2 py-2.5 last:border-b-0 lg:-mx-2.5 lg:px-2.5 lg:py-3";
const themeOption = "resident-settings-theme-button flex min-w-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs lg:text-sm font-semibold";

export const settingsStyles = {
  page: "resident-settings mx-auto min-w-0 w-full max-w-3xl space-y-4 animate-in fade-in duration-300 md:space-y-5 lg:space-y-6",
  header: "resident-settings-header hidden flex-col gap-2.5 md:flex md:flex-row md:items-center md:justify-between",
  title: "resident-settings-title gw-page-title lg:text-ui-page-lg text-foreground tracking-tight",
  description: "resident-settings-description mt-0.5 text-xs lg:text-sm text-muted-foreground",
  section: "resident-settings-section min-w-0 space-y-3 rounded-xl border border-border/80 bg-card p-3.5 md:space-y-4 md:p-5 lg:p-6",
  sectionHeader: "flex min-w-0 items-start gap-2.5 border-b border-border/60 pb-2.5 lg:items-center lg:gap-3 lg:pb-3",
  icon: "resident-settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs [&_svg]:size-4",
  sectionTitle: "gw-heading break-words text-sm lg:text-base text-foreground tracking-tight",
  sectionDescription: "resident-settings-section-description mt-0.5 break-words text-ui-caption lg:text-xs text-muted-foreground leading-tight",
  row,
  toggleRow: `${row} transition-colors hover:bg-muted/30`,
  actionRow: `${row} group w-[calc(100%+16px)] cursor-pointer text-left transition-all hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] lg:w-[calc(100%+20px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`,
  rowContent: "resident-settings-row-content flex min-w-0 flex-1 items-center gap-3",
  rowLabel: "break-words text-xs lg:text-sm font-semibold text-foreground tracking-tight",
  rowDescription: "resident-settings-row-description mt-0.5 break-words text-ui-caption text-muted-foreground leading-relaxed [overflow-wrap:anywhere]",
  themeHeading: "flex min-w-0 flex-wrap items-center justify-between gap-2",
  themeGrid: "resident-settings-theme-grid grid min-w-0 grid-cols-2 gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-1",
  themeButton: `${themeOption} transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`,
  themeSkeleton: `${themeOption} h-10`,
  footer: "px-2 py-2 text-center text-ui-caption text-muted-foreground/70 font-medium leading-relaxed [overflow-wrap:anywhere]",
} as const;
