import type { ReactNode } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string
  children: ReactNode
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
}

export function IconButton({
  label,
  children,
  tooltipSide = 'bottom',
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn('text-muted-foreground', className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
}
