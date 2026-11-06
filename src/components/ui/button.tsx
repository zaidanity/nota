import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-foreground shadow-[0_2px_8px_-3px_rgb(232_88_43/0.6)] hover:bg-accent-hover hover:shadow-[0_4px_12px_-3px_rgb(232_88_43/0.6)]',
        secondary:
          'border border-border bg-surface text-foreground shadow-soft hover:border-border-strong hover:bg-surface-2',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-foreground/25 hover:bg-surface-2',
        ghost: 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        soft: 'bg-accent-soft text-accent hover:bg-accent-soft/70',
        danger: 'bg-danger text-white hover:opacity-90',
        'danger-soft': 'bg-danger-soft text-danger hover:bg-danger/10',
      },
      size: {
        default: 'h-10 px-3.5 sm:h-9',
        sm: 'h-9 px-3 text-[13px] sm:h-8',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        'icon-sm': 'h-8 w-8 sm:h-7 sm:w-7',
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
