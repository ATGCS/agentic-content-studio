import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#1664ff]/30",
  {
    variants: {
      variant: {
        default:
          'bg-[#1664ff] text-white hover:bg-[#0550ed] active:scale-[0.98]',
        destructive:
          'bg-[#f53f3f] text-white hover:bg-[#d9363e] active:scale-[0.98]',
        outline:
          'border border-[#e5e8ef] bg-white text-[#1D2129] hover:bg-[#f5f7fa] hover:border-[#d0d5dd] active:scale-[0.98]',
        secondary:
          'bg-[#f0f5ff] text-[#1664ff] hover:bg-[#e0ecff] active:scale-[0.98]',
        ghost:
          'text-[#86909c] hover:bg-[#f5f7fa] hover:text-[#1D2129]',
        link: 'text-[#1664ff] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-lg px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading,
  children,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  }) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  if (isLoading === undefined) {
    return (
      <button
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        'grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1',
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-2', isLoading && 'invisible')}>
        {children}
      </span>
      <span className={cn('flex items-center justify-center', !isLoading && 'invisible')}>
        <Spinner />
      </span>
    </button>
  );
}

export { Button, buttonVariants };
