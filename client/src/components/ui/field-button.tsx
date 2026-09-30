import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldStyles, type FieldSize } from "./fieldStyles";

type FieldButtonProps = React.ComponentProps<"button"> & { fieldSize?: FieldSize };

/** Input-shaped trigger for date, time, and custom selection popovers. */
const FieldButton = React.forwardRef<HTMLButtonElement, FieldButtonProps>(
  ({ className, fieldSize = "standard", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 text-left disabled:opacity-50",
        fieldStyles.surface,
        fieldStyles[fieldSize],
        className,
      )}
      {...props}
    />
  ),
);
FieldButton.displayName = "FieldButton";

export { FieldButton };
