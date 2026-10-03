import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/SearchInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fieldStyles, type FieldSize } from "./fieldStyles";
import "./select-motion.css";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  fieldSize?: FieldSize;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  leadingIcon?: React.ReactNode;
}

/** A consistent select that adds filtering automatically for long option lists. */
export function SearchableSelect({
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  fieldSize = "standard",
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search options...",
  emptyMessage = "No options found.",
  disabled,
  className,
  contentClassName,
  leadingIcon,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const commandRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const searchable = options.length >= 10;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSearch("");
              setOpen(true);
            }
          }}
          className={cn(
            "gw-select-trigger w-full justify-between gap-2 font-normal hover:bg-background hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:ring-0",
            fieldStyles.surface,
            fieldStyles[fieldSize],
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {leadingIcon}
            <span className="truncate" data-placeholder={!selected ? "" : undefined}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="gw-select-chevron h-4 w-4 shrink-0 text-muted-foreground/70"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (searchRef.current ?? commandRef.current)?.focus();
        }}
        className={cn(
          "gw-select-menu w-[var(--radix-popover-trigger-width)] min-w-[14rem] overflow-hidden rounded-xl border border-border/80 bg-popover p-0 text-popover-foreground shadow-md",
          contentClassName,
        )}
      >
        <Command ref={commandRef} tabIndex={-1} defaultValue={value} label={ariaLabel ?? placeholder} className="flex max-h-[19rem] w-full flex-col bg-transparent">
          {searchable && (
            <div className="relative shrink-0 border-b border-border/70 bg-muted/20 px-2.5 py-2">
              <SearchInput
                asChild
                ref={searchRef}
                value={search}
                onChange={setSearch}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              >
                <CommandInput onValueChange={setSearch} />
              </SearchInput>
            </div>
          )}
          <CommandList className="min-h-0 max-h-60 overflow-y-auto overscroll-contain p-1.5 scrollbar-thin">
            <CommandEmpty className="px-3 py-8 text-center text-xs text-muted-foreground">
              <Search aria-hidden="true" className="mx-auto mb-2 h-5 w-5 opacity-45" />
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup className="space-y-0.5">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, option.keywords ?? ""]}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="group flex min-h-9 w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground outline-none transition-colors data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground sm:text-sm"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded text-primary transition-opacity",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
