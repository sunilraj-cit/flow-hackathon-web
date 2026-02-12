import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const redButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-red-600 text-white shadow hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600",
        outline:
          "border-2 border-red-600 bg-transparent text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-600",
        ghost:
          "text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-600",
        link: "text-red-600 underline-offset-4 hover:underline focus-visible:ring-red-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-lg",
        icon: "h-10 w-10",
      },
      responsive: {
        true: "text-xs sm:text-sm md:text-base h-9 px-3 sm:h-10 sm:px-4 md:h-11 md:px-6",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      responsive: false,
    },
  }
);

export interface RedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof redButtonVariants> {
  /**
   * If true, the button will be rendered as a child component
   */
  asChild?: boolean;
  /**
   * If true, the button will show a loading state
   */
  loading?: boolean;
}

/**
 * RedButton component - A reusable red button with hover states and responsive sizing
 * 
 * @example
 * ```tsx
 * <RedButton>Click me</RedButton>
 * <RedButton variant="outline" size="lg">Large Outline</RedButton>
 * <RedButton responsive>Responsive Button</RedButton>
 * <RedButton loading disabled>Loading...</RedButton>
 * ```
 */
const RedButton = React.forwardRef<HTMLButtonElement, RedButtonProps>(
  (
    {
      className,
      variant,
      size,
      responsive,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(redButtonVariants({ variant, size, responsive, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

RedButton.displayName = "RedButton";

export { RedButton, redButtonVariants };