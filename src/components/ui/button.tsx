import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(30_27_20/0.12)] hover:bg-accent-hover',
        secondary:
          'border border-border bg-surface text-foreground shadow-[0_1px_1px_rgb(30_27_20/0.03)] hover:border-border-strong hover:bg-surface-2',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-foreground/25 hover:bg-surface-2',
        ghost: 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        soft: 'bg-accent-soft text-accent hover:bg-accent-soft/80',
        danger: 'bg-danger text-white hover:opacity-90',
        'danger-soft': 'bg-danger-soft text-danger hover:bg-danger/10',
      },
      size: {
        default: 'h-11 px-3.5 sm:h-9',
        sm: 'h-9 px-3 text-[13px] sm:h-8',
        lg: 'h-12 px-5 text-[15px]',
        icon: 'h-11 w-11 sm:h-9 sm:w-9',
        'icon-sm': 'h-9 w-9 sm:h-8 sm:w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
