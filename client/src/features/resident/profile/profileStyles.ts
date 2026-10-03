import { residentPageStyles } from "@/components/common/residentPageStyles";
import "./profile.css";

const panel = "resident-profile-panel min-w-0 space-y-4 rounded-2xl border border-border/80 bg-card p-4";
const fieldRow = "resident-profile-field flex min-w-0 items-start justify-between gap-3 py-3";

export const profileStyles = {
  page: `${residentPageStyles.page} resident-profile max-w-3xl`,
  stack: "resident-profile-stack space-y-4",
  hero: "min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card",
  cover: "resident-profile-cover relative h-28 overflow-hidden border-b border-border/50 bg-muted/50",
  identity: "resident-profile-identity relative p-4 pt-0",
  identityRow: "resident-profile-identity-row -mt-10 flex min-w-0 flex-col items-start gap-3",
  avatar: "resident-profile-avatar size-20",
  identityDetails: "resident-profile-identity-details min-w-0 w-full space-y-2",
  nameRow: "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2",
  name: "resident-profile-name break-words text-xl font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
  identityMeta: "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
  body: "resident-profile-body grid min-w-0 grid-cols-1 items-start gap-4",
  panel,
  personal: `${panel} resident-profile-personal`,
  sectionHeader: "flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3",
  sectionHeading: "flex min-w-0 flex-1 items-start gap-2.5",
  sectionIcon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4",
  sectionTitle: "gw-heading text-sm leading-snug tracking-tight text-foreground",
  sectionDescription: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
  fieldRow,
  fieldInteractive: `${fieldRow} group`,
  fieldIcon: "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground [&_svg]:size-4",
  fieldLabel: "text-xs font-medium text-muted-foreground",
  fieldValue: "mt-1 break-words text-sm font-medium leading-relaxed text-foreground [overflow-wrap:anywhere]",
  fieldButton: "h-8 shrink-0 gap-1 px-2.5 text-xs",
  actionButton: "h-8 max-w-full gap-1.5 px-2.5 text-xs [&_svg]:size-3.5",
  resolution: "min-w-0 space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3",
  stats: "resident-profile-stats grid min-w-0 grid-cols-2 gap-2",
  stat: "min-w-0 space-y-1 rounded-xl border border-border/60 bg-muted/20 p-3 text-center",
  statLabel: "break-words text-[11px] font-medium leading-snug text-muted-foreground",
  badges: "resident-profile-badges grid min-w-0 grid-cols-1 gap-3",
  badge: "flex min-w-0 items-start gap-3 rounded-xl border p-3",
  logout: "group flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  privacy: "mx-auto flex max-w-xl items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-relaxed text-muted-foreground/70",
} as const;
