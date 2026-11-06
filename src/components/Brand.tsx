import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(30_27_20/0.18),inset_0_1px_0_rgb(255_255_255/0.14)]',
        className,
      )}
      aria-hidden="true"
    >
      <FileText className="size-[17px]" strokeWidth={1.8} />
      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full border border-accent bg-[#f7f6f2] dark:bg-[#151513]" />
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
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Nota
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-subtle">
              beta
            </span>
          </div>
          <p className="text-[10px] leading-none text-subtle">Catatan lokal dengan AI</p>
        </div>
      )}
    </div>
  )
}
