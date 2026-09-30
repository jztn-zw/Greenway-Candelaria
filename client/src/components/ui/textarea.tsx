import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldStyles, type FieldSize } from "./fieldStyles";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fieldSize?: FieldSize;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, fieldSize = "standard", ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full disabled:opacity-50",
        fieldStyles.surface,
        fieldStyles[fieldSize],
        fieldStyles.placeholder,
        "h-auto py-2.5",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
