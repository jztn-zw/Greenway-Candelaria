import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldStyles, type FieldSize } from "./fieldStyles";

type InputProps = React.ComponentProps<"input"> & { fieldSize?: FieldSize };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, fieldSize = "standard", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:opacity-50",
          fieldStyles.surface,
          fieldStyles[fieldSize],
          fieldStyles.placeholder,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
