import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "gw-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-ui-body font-semibold ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "gw-action-primary",
        destructive: "gw-action-destructive",
        "destructive-outline": "gw-action-destructive-outline border",
        "destructive-ghost": "gw-action-destructive-ghost",
        outline: "gw-action-outline border",
        "primary-outline": "gw-action-primary-outline border",
        "primary-ghost": "gw-action-primary-ghost",
        warning: "gw-action-warning",
        "warning-outline": "gw-action-warning-outline border",
        secondary: "gw-action-secondary",
        ghost: "gw-action-ghost",
        link: "gw-action-link underline-offset-4 hover:underline",
        hero: "gw-action-primary",
        "hero-outline": "gw-action-primary-outline border",
        forest: "gw-action-forest",
        "inverse-outline": "gw-action-inverse-outline border",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
