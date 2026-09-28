import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  id?: string;
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
  const selected = options.find((option) => option.value === value);
  const searchable = options.length >= 10;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-xl border-input/80 bg-background px-3.5 py-2 text-xs font-normal text-foreground shadow-2xs transition-colors duration-150 hover:border-primary/50 hover:bg-background hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 sm:text-sm data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/15",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {leadingIcon}
            <span className={cn("truncate", !selected && "text-muted-foreground/70")}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200",
              open && "rotate-180 text-primary",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[14rem] overflow-hidden rounded-xl border border-border/80 bg-popover p-0 text-popover-foreground shadow-lg",
          contentClassName,
        )}
      >
        <Command className="flex max-h-[19rem] w-full flex-col bg-transparent">
          {searchable && (
            <div className="relative shrink-0 border-b border-border/70 bg-muted/20 px-2.5 py-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <CommandInput
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-border/70 bg-background py-2 pl-9 pr-3 text-xs text-foreground shadow-2xs outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
              />
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
                  value={`${option.label} ${option.keywords ?? ""}`}
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
