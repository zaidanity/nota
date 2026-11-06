import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-[9px] text-white shadow-[0_2px_8px_-2px_rgb(232_88_43/0.55),inset_0_1px_0_rgb(255_255_255/0.28)]',
        className,
      )}
      style={{ backgroundImage: 'linear-gradient(140deg, var(--accent), #f59e0b)' }}
      aria-hidden="true"
    >
      <FileText className="size-[17px]" strokeWidth={1.9} />
      <span className="absolute -right-1 -top-1 size-2 rounded-full border-2 border-sidebar bg-[var(--mark)]" />
    </span>
  )
}

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      {compact ? null : (
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-foreground">
              Nota
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
              beta
            </span>
          </div>
          <p className="text-[10px] leading-none text-subtle">Catatan lokal</p>
        </div>
      )}
    </div>
  )
}
