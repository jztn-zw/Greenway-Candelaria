import "./navigationMotion.css";

/** Shared web navigation geometry and states for all three portals. */
export const navigationStyles = {
  brand: "gw-navigation-brand flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5 text-left cursor-pointer motion-reduce:transition-none transition-colors hover:bg-sidebar-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:px-4",
  brandText: "gw-navigation-label min-w-0 flex-1 overflow-hidden",
  link: "gw-navigation-link flex min-w-0 w-full h-full items-center gap-2.5",
  itemLabel: "gw-navigation-label truncate flex-1 tracking-tight",
  accountRow: "gw-navigation-account-row relative flex items-center gap-2.5",
  accountDetails: "gw-navigation-label flex flex-1 items-center justify-between min-w-0 overflow-hidden",
  divider: "gw-navigation-divider my-2 border-t border-border/60",
  signOutLabel: "gw-navigation-label truncate",
  brandIcon: "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]",
  brandName: "font-body text-lg font-semibold tracking-tight leading-tight text-foreground",
  brandCaption: "mt-0.5 truncate text-xs font-normal leading-normal text-muted-foreground",
  content: "gw-navigation-content flex flex-col gap-5 overflow-y-auto px-3 py-5 group-data-[collapsible=icon]:px-2",
  sectionLabel: "gw-navigation-section mb-1.5 h-auto select-none px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground",
  sectionTrigger: "gw-navigation-section mb-1.5 flex min-h-8 w-full cursor-pointer items-center justify-between rounded-md px-3 py-1 text-muted-foreground motion-reduce:transition-none transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  sectionText: "select-none text-[11px] font-medium tracking-wide",
  item: "gw-navigation-item group relative h-11 select-none md:h-10 rounded-lg border border-transparent px-3 text-[13px] font-medium motion-reduce:transition-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!px-4 group-data-[collapsible=icon]:!py-0 group-data-[collapsible=icon]:justify-start",
  activeItem: "data-[active=true]:bg-primary/[0.08] data-[active=true]:text-foreground hover:bg-primary/[0.12] hover:text-foreground data-[active=true]:font-semibold before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary group-data-[collapsible=icon]:before:hidden",
  inactiveItem: "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
  footer: "gw-navigation-footer gap-0 border-t border-sidebar-border bg-sidebar px-3 py-3 group-data-[collapsible=icon]:px-2",
  account: "gw-navigation-account px-1 py-1 group-data-[collapsible=icon]:px-2",
  avatar: "size-9 rounded-lg border border-border/60",
  accountName: "truncate font-body text-[13px] font-medium leading-tight text-foreground",
  settings: "gw-action-ghost flex size-11 shrink-0 cursor-pointer md:size-9 items-center justify-center rounded-lg motion-reduce:transition-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  accountMenuItem: "mx-1 flex min-h-11 w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-[var(--button-neutral-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9 motion-reduce:transition-none",
  signOut: "gw-navigation-signout group flex h-11 w-full md:h-9 cursor-pointer items-center gap-2 rounded-lg border-none px-2 text-xs font-medium text-muted-foreground motion-reduce:transition-none transition-colors hover:bg-destructive/[0.08] hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-start",
  collapse: "gw-navigation-collapse gw-action-outline absolute -right-3.5 top-16 z-50 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  topbar: "sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background px-4 motion-reduce:transition-none transition-colors sm:px-6",
  breadcrumb: "flex min-w-0 items-center gap-1.5 text-[13px] sm:gap-2",
  currentPage: "truncate font-medium tracking-normal text-foreground",
  topbarActions: "flex shrink-0 items-center gap-1 sm:gap-2",
  menu: "gw-action-ghost flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg motion-reduce:transition-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  mobileMenu: "md:hidden",
  residentMobileMenu: "lg:hidden",
  topbarButton: "gw-action-ghost relative flex size-11 shrink-0 cursor-pointer md:size-9 items-center justify-center rounded-lg border border-transparent motion-reduce:transition-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  unreadBadge: "absolute -right-0.5 -top-0.5 flex h-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground ring-2 ring-background tabular-nums",
} as const;

export const navigationSectionTitle = (label: string) =>
  label.charAt(0) + label.slice(1).toLowerCase();
