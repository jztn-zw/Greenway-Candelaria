import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InputClearButton } from "./InputClearButton";
import { fieldStyles, type FieldSize } from "@/components/ui/fieldStyles";
import { cn } from "@/lib/utils";
import ActionButtonLoader from "./ActionButtonLoader";
import "./searchInput.css";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
  fieldSize?: FieldSize;
  loading?: boolean;
  loadingLabel?: string;
  /** Short visual hint for narrow fields; the full hint remains accessible. */
  compactPlaceholder?: string;
  /** Preserve specialized input behavior, such as cmdk's keyboard navigation. */
  asChild?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  compactPlaceholder,
  className,
  containerClassName,
  disabled,
  readOnly,
  fieldSize = "compact",
  loading = false,
  loadingLabel = "Searching…",
  asChild = false,
  children,
  ...props
}, forwardedRef) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(forwardedRef, () => inputRef.current!);
  const handleClear = () => {
    onChange("");
    if (onClear) onClear();
    inputRef.current?.focus();
  };
  const inputProps: React.ComponentPropsWithRef<typeof Input> = {
    ref: inputRef,
    type: "text",
    "aria-label": props["aria-labelledby"] ? undefined : placeholder,
    "aria-busy": loading || undefined,
    "aria-description": compactPlaceholder ? placeholder : undefined,
    value,
    onChange: (event) => onChange(event.target.value),
    placeholder,
    disabled,
    readOnly,
    className: cn(
      fieldStyles.surface, fieldStyles[fieldSize], fieldStyles.placeholder,
      "w-full min-w-0 min-h-11 pl-9 pr-8 md:min-h-0",
      className,
    ),
    ...props,
  };

  return (
    <div className={cn("relative w-full", compactPlaceholder && "gw-search-input", containerClassName)}>
      {loading ? (
        <span className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          <ActionButtonLoader className="[--action-loader-width:1.5rem] [--action-loader-height:1.25rem] [--action-loader-canvas-size:2.5rem]" />
          <span role="status" className="sr-only">{loadingLabel}</span>
        </span>
      ) : <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
      {asChild
        ? <Slot {...inputProps}>{children}</Slot>
        : <Input {...inputProps} fieldSize={fieldSize} />}
      {compactPlaceholder && value.length === 0 && (
        <span aria-hidden="true" className={cn("gw-search-short-placeholder pointer-events-none absolute inset-y-0 left-9 right-8 hidden items-center text-field-placeholder", fieldSize === "standard" ? "text-ui-body" : "text-ui-label")}>
          <span className="truncate">{compactPlaceholder}</span>
        </span>
      )}
      {value.length > 0 && !disabled && !readOnly && (
        <InputClearButton
          onClick={handleClear}
          label="Clear search"
        />
      )}
    </div>
  );
});
SearchInput.displayName = "SearchInput";
