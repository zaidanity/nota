import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-[0_1px_1px_rgb(30_27_20/0.02)] outline-none transition-colors placeholder:text-subtle focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-20 w-full resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-subtle focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Input, Textarea }
