import { Archive, FileText, Pin, Settings2, Trash2 } from 'lucide-react'
import { BrandMark } from '@/components/Brand'
import { cn } from '@/lib/utils'
import type { ViewFilter } from '@/lib/views'

interface RailProps {
  view: ViewFilter
  counts: { all: number; pinned: number; archived: number; trash: number }
  onSelectView: (view: ViewFilter) => void
  onOpenSettings: () => void
  onNavigate?: () => void
  className?: string
}

function RailItem({
  label,
  count,
  active,
  onClick,
  children,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex size-11 items-center justify-center rounded-xl transition-all duration-150',
        active
          ? 'bg-accent text-accent-foreground shadow-[0_3px_10px_-3px_rgb(232_88_43/0.7)]'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
      )}
    >
      {children}
      {typeof count === 'number' && count > 0 ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-center text-[9px] font-semibold leading-4',
            active ? 'bg-accent-foreground text-accent' : 'bg-surface-2 text-muted-foreground',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}

export function Rail({ view, counts, onSelectView, onOpenSettings, onNavigate, className }: RailProps) {
  const select = (next: ViewFilter) => {
    onSelectView(next)
    onNavigate?.()
  }

  return (
    <nav
      className={cn(
        'flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3',
        className,
      )}
    >
      <div className="mb-2">
        <BrandMark />
      </div>

      <RailItem label="Semua catatan" count={counts.all} active={view.type === 'all'} onClick={() => select({ type: 'all' })}>
        <FileText className="size-5" strokeWidth={1.8} />
      </RailItem>
      <RailItem label="Disematkan" count={counts.pinned} active={view.type === 'pinned'} onClick={() => select({ type: 'pinned' })}>
        <Pin className="size-5" strokeWidth={1.8} />
      </RailItem>
      <RailItem label="Arsip" count={counts.archived} active={view.type === 'archive'} onClick={() => select({ type: 'archive' })}>
        <Archive className="size-5" strokeWidth={1.8} />
      </RailItem>
      <RailItem label="Sampah" count={counts.trash} active={view.type === 'trash'} onClick={() => select({ type: 'trash' })}>
        <Trash2 className="size-5" strokeWidth={1.8} />
      </RailItem>

      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="mb-1 h-px w-7 bg-border" />
        <RailItem label="Pengaturan" active={false} onClick={onOpenSettings}>
          <Settings2 className="size-5" strokeWidth={1.8} />
        </RailItem>
      </div>
    </nav>
  )
}
